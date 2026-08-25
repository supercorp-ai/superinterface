import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  getTaskDeliveryDeduplicationId,
  scheduleTask,
  TASK_DELIVERY_RETRIES,
  TASK_DELIVERY_TIMEOUT,
} from '../../src/lib/tasks/scheduleTask'
import { cancelScheduledTask } from '../../src/lib/tasks/cancelScheduledTask'
import type { TaskScheduler } from '../../src/lib/tasks/schedulers/types'
import type { PrismaClient, Task } from '@prisma/client'

type TaskSchedule = PrismaJson.TaskSchedule

// ---- mock scheduler that records calls ----

const createRecordingScheduler = () => {
  const published: Array<{
    url: string
    body: Record<string, unknown>
    delay: number
    deduplicationId?: string
    retries?: number
    timeout?: Parameters<TaskScheduler['publishJSON']>[0]['timeout']
    messageId: string
  }> = []
  const deleted: string[] = []

  const scheduler: TaskScheduler = {
    publishJSON: async (opts) => {
      const messageId = randomUUID()
      published.push({ ...opts, messageId })
      return { messageId }
    },
    messages: {
      delete: async (messageId) => {
        deleted.push(messageId)
      },
    },
  }

  return { scheduler, published, deleted }
}

// ---- mock prisma ----

const createMockPrisma = () => {
  const updates: Array<{
    where: { id: string }
    data: { qstashMessageId: string }
  }> = []

  type UpdateArgs = { where: { id: string }; data: { qstashMessageId: string } }

  return {
    updates,
    prisma: {
      task: {
        update: async (args: UpdateArgs) => {
          updates.push(args)
          return args
        },
      },
    } as unknown as PrismaClient,
  }
}

// ---- helpers ----

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: randomUUID(),
    title: 'Test task',
    message: 'Test message',
    schedule: { start: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    key: '',
    qstashMessageId: null,
    threadId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Task

describe('scheduleTask with pluggable scheduler', () => {
  let recording: ReturnType<typeof createRecordingScheduler>
  let mockDb: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    recording = createRecordingScheduler()
    mockDb = createMockPrisma()
  })

  it('publishes to scheduler with correct url and body', async () => {
    process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'http://localhost:3000'

    const task = makeTask()
    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(recording.published.length, 1)
    assert.equal(
      recording.published[0].url,
      'http://localhost:3000/api/cloud/tasks/callback',
    )
    assert.deepEqual(recording.published[0].body, { taskId: task.id })
  })

  it('limits QStash delivery retries and sets a callback timeout', async () => {
    const task = makeTask()

    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(recording.published[0].retries, TASK_DELIVERY_RETRIES)
    assert.equal(recording.published[0].retries, 2)
    assert.equal(recording.published[0].timeout, TASK_DELIVERY_TIMEOUT)
    assert.equal(recording.published[0].timeout, '15m')
  })

  it('publishes with the deterministic ID for this task occurrence', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const task = makeTask({ schedule: { start } as TaskSchedule })

    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(
      recording.published[0].deduplicationId,
      getTaskDeliveryDeduplicationId({ task, nextIso: start }),
    )
  })

  it('stores messageId in database after publish', async () => {
    process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'http://localhost:3000'

    const task = makeTask()
    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(mockDb.updates.length, 1)
    assert.equal(mockDb.updates[0].where.id, task.id)
    assert.equal(
      mockDb.updates[0].data.qstashMessageId,
      recording.published[0].messageId,
    )
  })

  it('does nothing when schedule is null', async () => {
    const task = makeTask({ schedule: null as unknown as TaskSchedule })
    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(recording.published.length, 0)
    assert.equal(mockDb.updates.length, 0)
  })

  it('does nothing when no next occurrence exists', async () => {
    // Past start, no recurrence, no duration — no next occurrence
    const task = makeTask({
      schedule: {
        start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      } as unknown as TaskSchedule,
    })
    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(recording.published.length, 0)
  })

  it('sets delay to 0 for continuous schedule (duration, no recurrence)', async () => {
    process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'http://localhost:3000'

    const task = makeTask({
      schedule: {
        start: new Date(Date.now() - 60 * 1000).toISOString(),
        duration: 'PT1H',
      } as unknown as TaskSchedule,
    })

    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(recording.published.length, 1)
    assert.equal(recording.published[0].delay, 0)
  })

  it('uses callbackUrl when provided instead of env-based url', async () => {
    const task = makeTask()
    const customUrl = 'http://localhost:4000/custom/callback'

    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
      callbackUrl: customUrl,
    })

    assert.equal(recording.published.length, 1)
    assert.equal(recording.published[0].url, customUrl)
  })

  it('calculates future delay for future start', async () => {
    process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'http://localhost:3000'

    const futureStart = new Date(Date.now() + 120 * 1000).toISOString() // 2 min in future
    const task = makeTask({
      schedule: { start: futureStart } as unknown as TaskSchedule,
    })

    await scheduleTask({
      task,
      prisma: mockDb.prisma,
      scheduler: recording.scheduler,
    })

    assert.equal(recording.published.length, 1)
    // Delay should be approximately 120 seconds (give or take 2 for test execution)
    assert.ok(recording.published[0].delay >= 118)
    assert.ok(recording.published[0].delay <= 122)
  })

  it('does not update the task when publication fails', async () => {
    const scheduler: TaskScheduler = {
      publishJSON: async () => {
        throw new Error('QStash unavailable')
      },
      messages: { delete: async () => undefined },
    }

    await assert.rejects(
      scheduleTask({ task: makeTask(), prisma: mockDb.prisma, scheduler }),
      /QStash unavailable/,
    )
    assert.equal(mockDb.updates.length, 0)
  })

  it('deletes a just-published message when the task vanished before update', async () => {
    const task = makeTask()
    const error = new Error('Record not found') as Error & { code: string }
    error.code = 'P2025'
    const prisma = {
      task: { update: async () => Promise.reject(error) },
    } as unknown as PrismaClient

    await scheduleTask({ task, prisma, scheduler: recording.scheduler })

    assert.equal(recording.published.length, 1)
    assert.deepEqual(recording.deleted, [recording.published[0].messageId])
  })

  it('propagates non-deletion database errors without deleting the message', async () => {
    const task = makeTask()
    const prisma = {
      task: {
        update: async () => {
          throw new Error('database unavailable')
        },
      },
    } as unknown as PrismaClient

    await assert.rejects(
      scheduleTask({ task, prisma, scheduler: recording.scheduler }),
      /database unavailable/,
    )
    assert.equal(recording.deleted.length, 0)
  })
})

describe('task delivery deduplication IDs', () => {
  const nextIso = '2026-08-26T12:00:00.000Z'

  it('is stable for the same task revision and occurrence', () => {
    const task = makeTask()

    assert.equal(
      getTaskDeliveryDeduplicationId({ task, nextIso }),
      getTaskDeliveryDeduplicationId({ task: { ...task }, nextIso }),
    )
  })

  it('is safe for use as a QStash deduplication key', () => {
    const id = getTaskDeliveryDeduplicationId({ task: makeTask(), nextIso })

    assert.match(id, /^task-[a-f0-9]{64}$/)
  })

  it('changes for a different occurrence', () => {
    const task = makeTask()

    assert.notEqual(
      getTaskDeliveryDeduplicationId({ task, nextIso }),
      getTaskDeliveryDeduplicationId({
        task,
        nextIso: '2026-08-27T12:00:00.000Z',
      }),
    )
  })

  it('changes when the task message is edited', () => {
    const task = makeTask()

    assert.notEqual(
      getTaskDeliveryDeduplicationId({ task, nextIso }),
      getTaskDeliveryDeduplicationId({
        task: { ...task, message: 'Edited instructions' },
        nextIso,
      }),
    )
  })

  it('changes when the task schedule is edited', () => {
    const task = makeTask()

    assert.notEqual(
      getTaskDeliveryDeduplicationId({ task, nextIso }),
      getTaskDeliveryDeduplicationId({
        task: {
          ...task,
          schedule: { start: '2026-09-01T12:00:00.000Z' },
        },
        nextIso,
      }),
    )
  })

  it('changes for a different task even if content and occurrence match', () => {
    const task = makeTask()

    assert.notEqual(
      getTaskDeliveryDeduplicationId({ task, nextIso }),
      getTaskDeliveryDeduplicationId({
        task: { ...task, id: randomUUID() },
        nextIso,
      }),
    )
  })
})

describe('cancelScheduledTask with pluggable scheduler', () => {
  it('cancels via scheduler when qstashMessageId exists', async () => {
    const recording = createRecordingScheduler()
    const task = makeTask({ qstashMessageId: 'msg-123' })

    await cancelScheduledTask({ task, scheduler: recording.scheduler })

    assert.equal(recording.deleted.length, 1)
    assert.equal(recording.deleted[0], 'msg-123')
  })

  it('does nothing when qstashMessageId is null', async () => {
    const recording = createRecordingScheduler()
    const task = makeTask({ qstashMessageId: null })

    await cancelScheduledTask({ task, scheduler: recording.scheduler })

    assert.equal(recording.deleted.length, 0)
  })
})

describe('scheduler interchangeability', () => {
  it('scheduleTask works with any TaskScheduler implementation', async () => {
    process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'http://localhost:3000'

    const task = makeTask()

    // Test with recording scheduler
    const recording1 = createRecordingScheduler()
    const mockDb1 = createMockPrisma()
    await scheduleTask({
      task,
      prisma: mockDb1.prisma,
      scheduler: recording1.scheduler,
    })

    // Test with a completely different implementation
    const recording2 = createRecordingScheduler()
    const mockDb2 = createMockPrisma()
    await scheduleTask({
      task,
      prisma: mockDb2.prisma,
      scheduler: recording2.scheduler,
    })

    // Both should have published exactly once with the same parameters
    assert.equal(recording1.published.length, 1)
    assert.equal(recording2.published.length, 1)
    assert.equal(recording1.published[0].url, recording2.published[0].url)
    assert.deepEqual(recording1.published[0].body, recording2.published[0].body)
    assert.ok(
      Math.abs(recording1.published[0].delay - recording2.published[0].delay) <=
        2,
      'Delays should be within 2 seconds of each other',
    )

    // Both should have stored a messageId
    assert.equal(mockDb1.updates.length, 1)
    assert.equal(mockDb2.updates.length, 1)
  })
})
