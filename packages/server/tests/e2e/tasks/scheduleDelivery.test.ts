import assert from 'node:assert/strict'
import { after, beforeEach, describe, it, mock } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { taskDeliveryId } from '../../lib/tasks/taskDeliveryId'
import { callRoute } from '../../lib/http/callRoute'
import { startFakeQstash } from '../../lib/qstash/startFakeQstash'

// When a task is created or updated, its next occurrence decides the QStash
// delivery delay. These tests read that delay back from the fake QStash to
// check how schedules are resolved to their next run.

// Monday 2030-01-07 12:00 UTC.
const NOW = new Date('2030-01-07T12:00:00.000Z')
const HOUR = 3600
const DAY = 24 * HOUR

const fakeQstash = await startFakeQstash()
process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'
process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'https://superinterface.test'

mock.timers.enable({ apis: ['Date'], now: NOW })

const tasksRoute = await import('../../../src/app/api/tasks/route')
const taskRoute = await import('../../../src/app/api/tasks/[taskId]/route')

beforeEach(() => {
  fakeQstash.reset()
})

after(async () => {
  mock.timers.reset()
  await fakeQstash.close()
})

// Creates a task with `schedule` and returns the response plus the delay (in
// seconds) QStash was asked to wait, or null when nothing was published.
const create = async ({ schedule }: { schedule: unknown }) => {
  const { authorization, thread } = await createTaskTestContext()
  fakeQstash.reset()
  const response = await callRoute({
    appHandler: tasksRoute,
    method: 'POST',
    authorization,
    body: { title: 'Task', message: 'Hi', threadId: thread.id, schedule },
  })
  const [publish] = fakeQstash.publishes
  const delay = publish
    ? Number(publish.headers['upstash-delay'].replace(/s$/, ''))
    : null

  return { response, delay }
}

// Stored schedules may predate validation and not match the current type.
const storedSchedule = (value: unknown) => value as PrismaJson.TaskSchedule

// Creates a task that must be scheduled, checks its delivery and returns the
// delay until its next occurrence.
const delayFor = async ({ schedule }: { schedule: unknown }) => {
  const { response, delay } = await create({ schedule })
  assert.equal(response.status, 200, JSON.stringify(response.json))

  // One delivery to the callback for this task, with bounded retries, a
  // timeout and an id derived from the task and the occurrence it is for.
  const { task } = response.json
  const nextIso = new Date(NOW.getTime() + Number(delay) * 1000).toISOString()
  assert.equal(fakeQstash.publishes.length, 1)
  const [publish] = fakeQstash.publishes
  assert.deepEqual(
    {
      destination: publish.destination,
      body: publish.body,
      retries: publish.headers['upstash-retries'],
      timeout: publish.headers['upstash-timeout'],
      deduplicationId: publish.headers['upstash-deduplication-id'],
    },
    {
      destination: 'https://superinterface.test/api/cloud/tasks/callback',
      body: { taskId: task.id },
      retries: '2',
      timeout: '15m',
      deduplicationId: taskDeliveryId({ task, nextIso }),
    },
  )
  const dbTask = await prisma.task.findUniqueOrThrow({
    where: { id: task.id },
  })
  assert.equal(dbTask.qstashMessageId, publish.messageId)

  return delay
}

describe('next occurrence of recurring schedules', () => {
  it('steps by the interval from the start until after now', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-07T00:00:00Z',
          recurrenceRules: [{ frequency: 'hourly', interval: 5 }],
        },
      }),
      3 * HOUR,
    )
  })

  it('uses a future start as the first occurrence', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-08T13:00:00Z',
          recurrenceRules: [{ frequency: 'weekly' }],
        },
      }),
      DAY + HOUR,
    )
  })

  it('advances to the next matching hour', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const created = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Task',
        message: 'Hi',
        threadId: thread.id,
        schedule: {
          start: '2030-01-07T10:00:00Z',
          recurrenceRules: [{ frequency: 'hourly', byHour: [15] }],
        },
      },
    })
    assert.equal(created.status, 200)

    // Delivered at 15:00 today, three hours from now, with bounded retries,
    // a timeout and an id derived from the task and that occurrence.
    assert.equal(fakeQstash.publishes.length, 1)
    const [publish] = fakeQstash.publishes
    assert.equal(
      publish.destination,
      'https://superinterface.test/api/cloud/tasks/callback',
    )
    assert.deepEqual(publish.body, { taskId: created.json.task.id })
    assert.equal(publish.headers['upstash-delay'], `${3 * HOUR}s`)
    assert.equal(publish.headers['upstash-retries'], '2')
    assert.equal(publish.headers['upstash-timeout'], '15m')
    assert.equal(
      publish.headers['upstash-deduplication-id'],
      taskDeliveryId({
        task: created.json.task,
        nextIso: '2030-01-07T15:00:00.000Z',
      }),
    )
    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: created.json.task.id },
    })
    assert.equal(dbTask.qstashMessageId, publish.messageId)

    // The 15:00 occurrence also blocks another task five minutes later.
    const blocked = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Task',
        message: 'Hi',
        threadId: thread.id,
        schedule: { start: '2030-01-07T15:05:00Z' },
      },
    })
    assert.equal(blocked.status, 400)
    assert.deepEqual(blocked.json, {
      error:
        'Tasks sharing a key and thread must be scheduled at least 15 minutes apart.',
    })
    assert.equal(fakeQstash.publishes.length, 1)
  })

  it('advances to the next matching minute', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-07T12:00:00Z',
          recurrenceRules: [{ frequency: 'minutely', byMinute: [45] }],
        },
      }),
      45 * 60,
    )
  })

  it('advances to the next matching second', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-07T12:00:00Z',
          recurrenceRules: [{ frequency: 'secondly', bySecond: [30] }],
        },
      }),
      30,
    )
  })

  it('advances to the next matching weekday', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-07T13:00:00Z',
          recurrenceRules: [{ frequency: 'daily', byDay: ['SA'] }],
        },
      }),
      5 * DAY + HOUR,
    )
  })

  it('advances to the next matching month', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-07T13:00:00Z',
          recurrenceRules: [{ frequency: 'daily', byMonth: [3] }],
        },
      }),
      53 * DAY + HOUR,
    )
  })

  it('requires every by-rule to match', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-07T13:00:00Z',
          recurrenceRules: [
            {
              frequency: 'daily',
              byMonth: [1],
              byDay: ['SA'],
              byHour: [13],
              byMinute: [0],
              bySecond: [0],
            },
          ],
        },
      }),
      5 * DAY + HOUR,
    )
  })

  // BUG: byHour/byMinute/bySecond only filter the stepped dates and never set
  // the time, so "daily at 09:00" starting at 13:00 never matches. After 5000
  // steps the non-matching date is used anyway: delivery ~13.7 years later.
  it('schedules ~5000 days ahead when the by-rules can never match', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-08T13:00:00Z',
          recurrenceRules: [{ frequency: 'daily', byHour: [9] }],
        },
      }),
      5000 * DAY + DAY + HOUR,
    )
  })

  it('picks the earliest occurrence across rules regardless of order', async () => {
    const start = '2030-01-01T13:00:00Z'
    assert.equal(
      await delayFor({
        schedule: {
          start,
          recurrenceRules: [{ frequency: 'weekly' }, { frequency: 'daily' }],
        },
      }),
      HOUR,
    )
    assert.equal(
      await delayFor({
        schedule: {
          start,
          recurrenceRules: [{ frequency: 'daily' }, { frequency: 'weekly' }],
        },
      }),
      HOUR,
    )
  })

  it('skips rules that ended by until or count', async () => {
    const start = '2030-01-01T13:00:00Z'
    assert.equal(
      await delayFor({
        schedule: {
          start,
          recurrenceRules: [
            { frequency: 'daily', until: '2030-01-05T00:00:00Z' },
            { frequency: 'weekly' },
          ],
        },
      }),
      DAY + HOUR,
    )
    assert.equal(
      await delayFor({
        schedule: {
          start,
          recurrenceRules: [
            { frequency: 'daily', count: 3 },
            { frequency: 'weekly' },
          ],
        },
      }),
      DAY + HOUR,
    )
  })

  it('keeps rules whose until and count are still ahead', async () => {
    assert.equal(
      await delayFor({
        schedule: {
          start: '2030-01-01T13:00:00Z',
          recurrenceRules: [
            {
              frequency: 'daily',
              until: '2030-02-01T00:00:00Z',
              count: 30,
            },
          ],
        },
      }),
      HOUR,
    )
  })

  it('rejects a schedule whose only rule ran out of occurrences', async () => {
    const { response, delay } = await create({
      schedule: {
        start: '2030-01-01T13:00:00Z',
        recurrenceRules: [{ frequency: 'daily', count: 3 }],
      },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid schedule' })
    assert.equal(delay, null)
  })

  it('treats an empty rule list as a one-off schedule', async () => {
    assert.equal(
      await delayFor({
        schedule: { start: '2030-01-07T14:00:00Z', recurrenceRules: [] },
      }),
      2 * HOUR,
    )
  })

  it('rejects an unknown time zone', async () => {
    const { response } = await create({
      schedule: { start: '2030-01-07T14:00:00Z', timeZone: 'Mars/Olympus' },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid schedule' })
  })
})

describe('rescheduling stored schedules', () => {
  it('publishes nothing when a stored rule has an unknown frequency', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const task = await createTestTask({
      data: {
        threadId: thread.id,
        qstashMessageId: 'msg_old',
        schedule: storedSchedule({
          start: '2030-01-08T13:00:00Z',
          recurrenceRules: [{ frequency: 'fortnightly' }],
        }),
      },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: task.id },
      authorization,
      body: { title: 'Renamed' },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(fakeQstash.deletes, ['msg_old'])
    assert.equal(fakeQstash.publishes.length, 0)
  })

  it('publishes nothing when the stored schedule is not an object', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const task = await createTestTask({
      data: { threadId: thread.id, schedule: storedSchedule('tomorrow') },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: task.id },
      authorization,
      body: { message: 'Updated' },
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.task.schedule, 'tomorrow')
    assert.equal(fakeQstash.publishes.length, 0)
    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    assert.equal(dbTask.message, 'Updated')
  })
})
