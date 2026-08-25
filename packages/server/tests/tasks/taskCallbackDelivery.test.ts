import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'

import type { PrismaClient, Task } from '@prisma/client'
import {
  buildPOST,
  TASK_EXECUTION_RETRY_AFTER_SECONDS,
} from '../../src/app/api/tasks/callback/buildRoute'
import type { TaskScheduler } from '../../src/lib/tasks/schedulers/types'
import {
  createInMemoryTaskExecutionLocker,
  TASK_EXECUTION_LOCK_TTL_SECONDS,
  type TaskExecutionLocker,
} from '../../src/lib/tasks/taskExecutionLocker'

type PublishOptions = Parameters<TaskScheduler['publishJSON']>[0]
type TaskExecutor = ({ taskId }: { taskId: string }) => Promise<Response | null>

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: randomUUID(),
    title: 'Test task',
    message: 'Run the task',
    schedule: {
      start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    key: 'test-task',
    qstashMessageId: 'message-current',
    threadId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Task

const taskRequest = ({
  taskId,
  messageId = 'message-current',
}: {
  taskId: string
  messageId?: string | null
}) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (messageId) headers.set('Upstash-Message-Id', messageId)

  return new Request('http://localhost/api/tasks/callback', {
    method: 'POST',
    headers,
    body: JSON.stringify({ taskId }),
  })
}

const createHarness = ({
  task = makeTask(),
  locker = createInMemoryTaskExecutionLocker(),
  onFind,
}: {
  task?: Task | null
  locker?: TaskExecutionLocker
  onFind?: (options: {
    call: number
    task: Task | null
    setTask: (task: Task | null) => void
  }) => void
} = {}) => {
  let currentTask = task
  let findCalls = 0
  let executeCalls = 0
  let executor: TaskExecutor = async () => null
  const published: Array<PublishOptions & { messageId: string }> = []
  const updates: string[] = []

  const setTask = (nextTask: Task | null) => {
    currentTask = nextTask
  }

  const prisma = {
    task: {
      findUnique: async () => {
        findCalls += 1
        onFind?.({ call: findCalls, task: currentTask, setTask })
        return currentTask ? { ...currentTask } : null
      },
      update: async ({ data }: { data: { qstashMessageId: string } }) => {
        if (!currentTask) {
          const error = new Error('Task not found') as Error & { code: string }
          error.code = 'P2025'
          throw error
        }

        currentTask = {
          ...currentTask,
          qstashMessageId: data.qstashMessageId,
        }
        updates.push(data.qstashMessageId)
        return currentTask
      },
    },
  } as unknown as PrismaClient

  const scheduler: TaskScheduler = {
    publishJSON: async (options) => {
      const messageId = `message-published-${published.length + 1}`
      published.push({ ...options, messageId })
      return { messageId }
    },
    messages: { delete: async () => undefined },
  }

  const handler = buildPOST({
    prisma,
    scheduler,
    callbackUrl: 'http://localhost/api/tasks/callback',
    taskExecutionLocker: locker,
    taskExecutor: async (options) => {
      executeCalls += 1
      return executor(options)
    },
  })

  return {
    taskId: task?.id ?? 'deleted-task',
    handler,
    published,
    updates,
    get task() {
      return currentTask
    },
    get findCalls() {
      return findCalls
    },
    get executeCalls() {
      return executeCalls
    },
    setTask,
    setExecutor: (nextExecutor: TaskExecutor) => {
      executor = nextExecutor
    },
  }
}

const responseJson = async (response: Response) =>
  response.json() as Promise<Record<string, unknown>>

describe('scheduled task callback delivery safeguards', () => {
  it('acknowledges a delivery for a deleted task without executing it', async () => {
    const harness = createHarness({ task: null })

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await responseJson(response), {
      ok: true,
      ignored: 'task_deleted',
    })
    assert.equal(harness.executeCalls, 0)
    assert.equal(harness.published.length, 0)
  })

  it('acknowledges an old QStash branch before taking the lock', async () => {
    let lockCalls = 0
    const harness = createHarness({
      locker: {
        acquire: async () => {
          lockCalls += 1
          return null
        },
      },
    })

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId, messageId: 'message-old' }),
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await responseJson(response), {
      ok: true,
      ignored: 'stale_delivery',
    })
    assert.equal(lockCalls, 0)
    assert.equal(harness.executeCalls, 0)
  })

  it('executes the current message exactly once and publishes its successor', async () => {
    const harness = createHarness()

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await responseJson(response), { ok: true })
    assert.equal(harness.executeCalls, 1)
    assert.equal(harness.published.length, 1)
    assert.deepEqual(harness.published[0].body, { taskId: harness.taskId })
    assert.deepEqual(harness.updates, ['message-published-1'])
    assert.equal(harness.task?.qstashMessageId, 'message-published-1')
  })

  it('returns a retryable response while the task lock is held', async () => {
    const harness = createHarness({
      locker: { acquire: async () => null },
    })

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 503)
    assert.equal(
      response.headers.get('Retry-After'),
      String(TASK_EXECUTION_RETRY_AFTER_SECONDS),
    )
    assert.equal(harness.executeCalls, 0)
    assert.equal(harness.published.length, 0)
  })

  it('requests a lock that outlives the callback runtime', async () => {
    let requestedTtl = 0
    const underlying = createInMemoryTaskExecutionLocker()
    const harness = createHarness({
      locker: {
        acquire: async (options) => {
          requestedTtl = options.ttlSeconds
          return underlying.acquire(options)
        },
      },
    })

    await harness.handler(taskRequest({ taskId: harness.taskId }))

    assert.equal(requestedTtl, TASK_EXECUTION_LOCK_TTL_SECONDS)
    assert.equal(requestedTtl, 15 * 60)
  })

  it('rechecks the message ID after acquiring the lock', async () => {
    const harness = createHarness({
      onFind: ({ call, task, setTask }) => {
        if (call === 2 && task) {
          setTask({ ...task, qstashMessageId: 'message-newer' })
        }
      },
    })

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await responseJson(response), {
      ok: true,
      ignored: 'stale_delivery',
    })
    assert.equal(harness.executeCalls, 0)
    assert.equal(harness.published.length, 0)
  })

  it('acknowledges a task deleted while waiting for the lock', async () => {
    const harness = createHarness({
      onFind: ({ call, setTask }) => {
        if (call === 2) setTask(null)
      },
    })

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await responseJson(response), {
      ok: true,
      ignored: 'task_deleted',
    })
    assert.equal(harness.executeCalls, 0)
  })

  it('does not publish a successor when execution returns an error', async () => {
    const harness = createHarness()
    harness.setExecutor(async () =>
      Response.json({ error: 'execution failed' }, { status: 500 }),
    )

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 500)
    assert.equal(harness.executeCalls, 1)
    assert.equal(harness.published.length, 0)
    assert.equal(harness.task?.qstashMessageId, 'message-current')
  })

  it('releases the lock after an execution error response so a retry can recover', async () => {
    const locker = createInMemoryTaskExecutionLocker()
    const harness = createHarness({ locker })
    harness.setExecutor(async () =>
      Response.json({ error: 'temporary' }, { status: 500 }),
    )

    const failed = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )
    harness.setExecutor(async () => null)
    const retry = await harness.handler(taskRequest({ taskId: harness.taskId }))

    assert.equal(failed.status, 500)
    assert.equal(retry.status, 200)
    assert.equal(harness.executeCalls, 2)
    assert.equal(harness.published.length, 1)
  })

  it('releases the lock when execution throws so a retry can recover', async () => {
    const harness = createHarness()
    harness.setExecutor(async () => {
      throw new Error('assistant crashed')
    })

    await assert.rejects(
      harness.handler(taskRequest({ taskId: harness.taskId })),
      /assistant crashed/,
    )

    harness.setExecutor(async () => null)
    const retry = await harness.handler(taskRequest({ taskId: harness.taskId }))
    assert.equal(retry.status, 200)
    assert.equal(harness.executeCalls, 2)
    assert.equal(harness.published.length, 1)
  })

  it('does not resurrect a task deleted during execution', async () => {
    const harness = createHarness()
    harness.setExecutor(async () => {
      harness.setTask(null)
      return null
    })

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await responseJson(response), {
      ok: true,
      ignored: 'task_deleted',
    })
    assert.equal(harness.published.length, 0)
  })

  it('does not overwrite a schedule changed during execution', async () => {
    const harness = createHarness()
    harness.setExecutor(async () => {
      assert.ok(harness.task)
      harness.setTask({
        ...harness.task,
        qstashMessageId: 'message-from-update',
      })
      return null
    })

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await responseJson(response), {
      ok: true,
      ignored: 'task_changed',
    })
    assert.equal(harness.published.length, 0)
    assert.equal(harness.task?.qstashMessageId, 'message-from-update')
  })

  it('serializes concurrent callbacks and turns the old retry stale', async () => {
    const harness = createHarness()
    let finishExecution: (() => void) | undefined
    const executionStarted = new Promise<void>((resolve) => {
      harness.setExecutor(
        () =>
          new Promise<null>((finish) => {
            finishExecution = () => finish(null)
            resolve()
          }),
      )
    })

    const firstResponsePromise = harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )
    await executionStarted

    const overlapping = await harness.handler(
      taskRequest({ taskId: harness.taskId }),
    )
    assert.equal(overlapping.status, 503)
    assert.equal(harness.executeCalls, 1)

    finishExecution?.()
    const first = await firstResponsePromise
    assert.equal(first.status, 200)
    assert.equal(harness.published.length, 1)

    const oldRetry = await harness.handler(
      taskRequest({ taskId: harness.taskId, messageId: 'message-current' }),
    )
    assert.equal(oldRetry.status, 200)
    assert.deepEqual(await responseJson(oldRetry), {
      ok: true,
      ignored: 'stale_delivery',
    })
    assert.equal(harness.executeCalls, 1)
    assert.equal(harness.published.length, 1)
  })

  it('allows headerless local/manual callbacks for backwards compatibility', async () => {
    const harness = createHarness()

    const response = await harness.handler(
      taskRequest({ taskId: harness.taskId, messageId: null }),
    )

    assert.equal(response.status, 200)
    assert.equal(harness.executeCalls, 1)
    assert.equal(harness.published.length, 1)
  })
})
