import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, beforeEach, describe, it, mock } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { callRoute } from '../../lib/http/callRoute'
import { startFakeQstash } from '../../lib/qstash/startFakeQstash'

const NOW = new Date('2030-01-07T12:00:00.000Z')
const CALLBACK_URL = 'https://superinterface.test/api/cloud/tasks/callback'

const fakeQstash = await startFakeQstash()
process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'
process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'https://superinterface.test'

mock.timers.enable({ apis: ['Date'], now: NOW })

const tasksRoute = await import('../../../src/app/api/tasks/route')
const taskRoute = await import('../../../src/app/api/tasks/[taskId]/route')

const inMinutes = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60 * 1000).toISOString()

// Runs `fn` with console.error silenced, for requests expected to crash, and
// returns its result with the errors Next.js logged for the crash.
const quietly = async <T>(fn: () => Promise<T>) => {
  const consoleError = mock.method(console, 'error', () => undefined)
  try {
    const result = await fn()
    const errors = consoleError.mock.calls.map(
      ({ arguments: [error] }) => error as Error,
    )
    return { result, errors }
  } finally {
    consoleError.mock.restore()
  }
}

beforeEach(() => {
  fakeQstash.reset()
})

after(async () => {
  mock.timers.reset()
  await fakeQstash.close()
})

describe('POST /api/tasks', () => {
  it('rejects an unknown private api key', async () => {
    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization: 'Bearer not-a-real-key',
      body: {},
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid api key' })
  })

  it('rejects threads that belong to another workspace', async () => {
    const { authorization } = await createTaskTestContext()
    const other = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Foreign',
        message: 'Hi',
        threadId: other.thread.id,
        schedule: { start: inMinutes(60) },
      },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Thread not found' })
    assert.equal(fakeQstash.publishes.length, 0)
  })

  it('rejects a schedule without a start', async () => {
    const { authorization, thread } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'No start',
        message: 'Hi',
        threadId: thread.id,
        schedule: { recurrenceRules: [{ frequency: 'daily' }] },
      },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid schedule' })
  })

  it('rejects a recurring schedule whose rules have already ended', async () => {
    const { authorization, thread } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Ended',
        message: 'Hi',
        threadId: thread.id,
        schedule: {
          start: '2029-01-01T09:00:00Z',
          recurrenceRules: [
            { frequency: 'daily', until: '2029-02-01T00:00:00Z' },
          ],
        },
      },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid schedule' })
    assert.equal(await prisma.task.count({ where: { threadId: thread.id } }), 0)
  })

  it('creates a one-off task and publishes its delivery to QStash', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const start = inMinutes(60)

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Reminder',
        message: 'Remind me',
        threadId: thread.id,
        key: 'user-1',
        schedule: { start },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.task.key, 'user-1')
    assert.deepEqual(response.json.task.schedule, { start })

    assert.equal(fakeQstash.publishes.length, 1)
    const [publish] = fakeQstash.publishes
    assert.equal(publish.destination, CALLBACK_URL)
    assert.deepEqual(publish.body, { taskId: response.json.task.id })
    assert.equal(publish.headers['upstash-delay'], '3600s')
    assert.equal(publish.headers['upstash-retries'], '2')
    assert.equal(publish.headers['upstash-timeout'], '15m')
    assert.match(
      publish.headers['upstash-deduplication-id'],
      /^task-[0-9a-f]{64}$/,
    )
    assert.equal(publish.headers.authorization, 'Bearer test-qstash-token')

    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: response.json.task.id },
    })
    assert.equal(dbTask.qstashMessageId, publish.messageId)
  })

  it('defaults the key to an empty string', async () => {
    const { authorization, thread } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'No key',
        message: 'Hi',
        threadId: thread.id,
        schedule: { start: inMinutes(30) },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.task.key, '')
    assert.equal(fakeQstash.publishes[0].headers['upstash-delay'], '1800s')
  })

  it('stores a one-off task in the past without scheduling a delivery', async () => {
    const { authorization, thread } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Past',
        message: 'Hi',
        threadId: thread.id,
        schedule: { start: inMinutes(-60) },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(fakeQstash.publishes.length, 0)
    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: response.json.task.id },
    })
    assert.equal(dbTask.qstashMessageId, null)
  })

  it('delivers a continuous task immediately while inside its window', async () => {
    const { authorization, thread } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Continuous',
        message: 'Keep going',
        threadId: thread.id,
        schedule: { start: inMinutes(-60), duration: 'P1D' },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(fakeQstash.publishes.length, 1)
    assert.equal(fakeQstash.publishes[0].headers['upstash-delay'], '0s')
  })

  it('schedules a recurring task at its next occurrence in the task time zone', async () => {
    const { authorization, thread } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Daily standup',
        message: 'Standup time',
        threadId: thread.id,
        schedule: {
          start: '2030-01-01T09:00:00',
          timeZone: 'America/New_York',
          recurrenceRules: [{ frequency: 'daily' }],
        },
      },
    })

    assert.equal(response.status, 200)
    // 2030-01-07 12:00Z is 07:00 in New York, so the next run is 09:00 local.
    assert.equal(fakeQstash.publishes[0].headers['upstash-delay'], '7200s')
  })

  // BUG: validateSchedule accepts a one-off schedule whose start matches the
  // ISO regex but is not a real date. The task is stored and never delivered.
  it('accepts a one-off schedule with an impossible date and never delivers it', async () => {
    const { authorization, thread } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Impossible',
        message: 'Hi',
        threadId: thread.id,
        schedule: { start: '2030-13-45T25:00:00Z' },
      },
    })

    assert.equal(response.status, 200)
    assert.equal(fakeQstash.publishes.length, 0)
  })
})

describe('queueing deliveries with QStash', () => {
  const createTask = ({
    authorization,
    threadId,
  }: {
    authorization: string
    threadId: string
  }) =>
    callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Queued',
        message: 'Hi',
        threadId,
        schedule: { start: inMinutes(60) },
      },
    })

  it('cancels the new delivery when the task is deleted while it is queued', async () => {
    const { authorization, thread } = await createTaskTestContext()
    fakeQstash.overrideNextPublish({
      beforeRespond: async () => {
        await prisma.task.deleteMany({ where: { threadId: thread.id } })
      },
    })

    const response = await createTask({ authorization, threadId: thread.id })

    assert.equal(response.status, 200)
    assert.equal(fakeQstash.publishes.length, 1)
    assert.deepEqual(fakeQstash.deletes, [fakeQstash.publishes[0].messageId])
    assert.equal(await prisma.task.count({ where: { threadId: thread.id } }), 0)
  })

  it('fails when QStash answers with an unusable message id', async () => {
    const { authorization, thread } = await createTaskTestContext()
    fakeQstash.overrideNextPublish({ messageId: 12345 })

    const { result: response, errors } = await quietly(() =>
      createTask({ authorization, threadId: thread.id }),
    )

    assert.equal(response.status, 500)
    assert.equal(errors.length, 1)
    assert.equal(errors[0].name, 'PrismaClientValidationError')
    assert.match(errors[0].message, /Argument `qstashMessageId`: Invalid value/)
    // Not mistaken for a deleted task: the delivery is left in place.
    assert.deepEqual(fakeQstash.deletes, [])
  })

  // BUG: the task row is written before the delivery is queued, so when
  // QStash rejects the publish the API answers 500 but leaves behind a task
  // that will never run.
  it('leaves an undeliverable task behind when QStash rejects the publish', async () => {
    const { authorization, thread } = await createTaskTestContext()
    fakeQstash.setPublishStatus({ status: 400 })

    const { result: response, errors } = await quietly(() =>
      createTask({ authorization, threadId: thread.id }),
    )

    assert.equal(response.status, 500)
    assert.equal(errors.length, 1)
    assert.equal(errors[0].name, 'QstashError')
    assert.equal(errors[0].message, '{"error":"publish failed"}')
    const [task] = await prisma.task.findMany({
      where: { threadId: thread.id },
    })
    assert.equal(task.title, 'Queued')
    assert.equal(task.qstashMessageId, null)
  })
})

describe('stored schedules with an unknown time zone', () => {
  // BUG: a stored task whose time zone is unknown makes the conflict check
  // throw, so every create/update on that thread and key fails with a 500.
  it('breaks creating and updating other tasks on the same thread and key', async () => {
    const { authorization, thread } = await createTaskTestContext()
    await createTestTask({
      data: {
        threadId: thread.id,
        schedule: { start: inMinutes(60), timeZone: 'Mars/Olympus' },
      },
    })
    const sibling = await createTestTask({
      data: { threadId: thread.id, schedule: { start: inMinutes(600) } },
    })

    const { result: created, errors: createErrors } = await quietly(() =>
      callRoute({
        appHandler: tasksRoute,
        method: 'POST',
        authorization,
        body: {
          title: 'Blocked',
          message: 'Hi',
          threadId: thread.id,
          schedule: { start: inMinutes(300) },
        },
      }),
    )
    const { result: updated, errors: updateErrors } = await quietly(() =>
      callRoute({
        appHandler: taskRoute,
        method: 'PATCH',
        params: { taskId: sibling.id },
        authorization,
        body: { title: 'Blocked too' },
      }),
    )

    assert.equal(created.status, 500)
    assert.equal(updated.status, 500)
    // Both routes rethrow the conflict check's own error.
    for (const errors of [createErrors, updateErrors]) {
      assert.equal(errors.length, 1)
      assert.ok(errors[0] instanceof RangeError)
      assert.equal(
        errors[0].message,
        'Invalid time zone specified: Mars/Olympus',
      )
    }
    assert.equal(await prisma.task.count({ where: { threadId: thread.id } }), 2)
    assert.equal(fakeQstash.publishes.length, 0)
  })
})

describe('GET /api/tasks/[taskId]', () => {
  it('rejects an unknown private api key', async () => {
    const response = await callRoute({
      appHandler: taskRoute,
      method: 'GET',
      params: { taskId: randomUUID() },
      authorization: 'Bearer nope',
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid api key' })
  })

  it('rejects an empty task id', async () => {
    const { authorization } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'GET',
      params: { taskId: '' },
      authorization,
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'No task id found' })
  })

  it('does not reveal tasks from another workspace', async () => {
    const { authorization } = await createTaskTestContext()
    const other = await createTaskTestContext()
    const foreignTask = await createTestTask({
      data: { threadId: other.thread.id },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'GET',
      params: { taskId: foreignTask.id },
      authorization,
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'No task found' })
  })
})

describe('PATCH /api/tasks/[taskId]', () => {
  it('requires an authorization header', async () => {
    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: randomUUID() },
      body: { title: 'x' },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'No authorization header found' })
  })

  it('rejects a malformed task id', async () => {
    const { authorization } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: 'not-a-uuid' },
      authorization,
      body: { title: 'x' },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid task id' })
  })

  it('rejects a payload with wrongly typed fields', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const task = await createTestTask({ data: { threadId: thread.id } })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: task.id },
      authorization,
      body: { title: 42 },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid payload' })
  })

  it('returns not found for a task in another workspace', async () => {
    const { authorization } = await createTaskTestContext()
    const other = await createTaskTestContext()
    const foreignTask = await createTestTask({
      data: { threadId: other.thread.id },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: foreignTask.id },
      authorization,
      body: { title: 'Hijacked' },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'No task found' })
    const unchanged = await prisma.task.findUniqueOrThrow({
      where: { id: foreignTask.id },
    })
    assert.equal(unchanged.title, 'Test Task')
  })

  it('updates only the title, keeps the schedule and requeues the delivery', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const start = inMinutes(90)
    const task = await createTestTask({
      data: {
        threadId: thread.id,
        schedule: { start },
        qstashMessageId: 'msg_previous',
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
    assert.equal(response.json.task.title, 'Renamed')
    assert.equal(response.json.task.message, 'Test message')
    assert.deepEqual(response.json.task.schedule, { start })
    assert.deepEqual(fakeQstash.deletes, ['msg_previous'])
    assert.equal(fakeQstash.publishes.length, 1)
    assert.equal(fakeQstash.publishes[0].headers['upstash-delay'], '5400s')

    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    assert.equal(dbTask.qstashMessageId, fakeQstash.publishes[0].messageId)
  })

  it('updates the message and key together', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const task = await createTestTask({
      data: { threadId: thread.id, schedule: { start: inMinutes(60) } },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: task.id },
      authorization,
      body: { message: 'New message', key: 'user-2' },
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.task.message, 'New message')
    assert.equal(response.json.task.key, 'user-2')
    assert.equal(response.json.task.title, 'Test Task')
    // No previous QStash message, so nothing is cancelled.
    assert.deepEqual(fakeQstash.deletes, [])
  })

  it('checks conflicts against the new key when the key changes', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const start = inMinutes(60)
    await createTestTask({
      data: { threadId: thread.id, key: 'busy', schedule: { start } },
    })
    const task = await createTestTask({
      data: { threadId: thread.id, key: 'free', schedule: { start } },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: task.id },
      authorization,
      body: { key: 'busy' },
    })

    assert.equal(response.status, 400)
    assert.match(response.json.error, /at least 15 minutes apart/)
    const unchanged = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    assert.equal(unchanged.key, 'free')
  })

  it('still updates the task when cancelling the old delivery fails', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const task = await createTestTask({
      data: {
        threadId: thread.id,
        schedule: { start: inMinutes(60) },
        qstashMessageId: 'msg_gone',
      },
    })
    fakeQstash.setDeleteStatus({ status: 404 })
    const consoleError = mock.method(console, 'error', () => undefined)

    try {
      const response = await callRoute({
        appHandler: taskRoute,
        method: 'PATCH',
        params: { taskId: task.id },
        authorization,
        body: { schedule: { start: inMinutes(120) } },
      })

      assert.equal(response.status, 200)
      assert.deepEqual(fakeQstash.deletes, ['msg_gone'])
      assert.equal(fakeQstash.publishes[0].headers['upstash-delay'], '7200s')
      assert.equal(consoleError.mock.callCount(), 1)
      assert.equal(
        consoleError.mock.calls[0].arguments[0],
        'Failed to cancel scheduled task:',
      )
    } finally {
      consoleError.mock.restore()
    }
  })
})

describe('DELETE /api/tasks/[taskId]', () => {
  it('requires an authorization header', async () => {
    const response = await callRoute({
      appHandler: taskRoute,
      method: 'DELETE',
      params: { taskId: randomUUID() },
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'No authorization header found' })
  })

  it('rejects an unknown private api key', async () => {
    const response = await callRoute({
      appHandler: taskRoute,
      method: 'DELETE',
      params: { taskId: randomUUID() },
      authorization: 'Bearer nope',
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid api key' })
  })

  it('rejects a malformed task id', async () => {
    const { authorization } = await createTaskTestContext()

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'DELETE',
      params: { taskId: 'nope' },
      authorization,
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'Invalid task id' })
  })

  it('does not delete tasks from another workspace', async () => {
    const { authorization } = await createTaskTestContext()
    const other = await createTaskTestContext()
    const foreignTask = await createTestTask({
      data: { threadId: other.thread.id },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'DELETE',
      params: { taskId: foreignTask.id },
      authorization,
    })

    assert.equal(response.status, 400)
    assert.deepEqual(response.json, { error: 'No task found' })
    assert.ok(await prisma.task.findUnique({ where: { id: foreignTask.id } }))
  })

  it('deletes the task and cancels its pending delivery', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const task = await createTestTask({
      data: { threadId: thread.id, qstashMessageId: 'msg_pending' },
    })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'DELETE',
      params: { taskId: task.id },
      authorization,
    })

    assert.equal(response.status, 200)
    assert.equal(response.json.task.id, task.id)
    assert.deepEqual(fakeQstash.deletes, ['msg_pending'])
    assert.equal(await prisma.task.findUnique({ where: { id: task.id } }), null)
  })

  it('deletes a task that has no pending delivery', async () => {
    const { authorization, thread } = await createTaskTestContext()
    const task = await createTestTask({ data: { threadId: thread.id } })

    const response = await callRoute({
      appHandler: taskRoute,
      method: 'DELETE',
      params: { taskId: task.id },
      authorization,
    })

    assert.equal(response.status, 200)
    assert.deepEqual(fakeQstash.deletes, [])
  })
})
