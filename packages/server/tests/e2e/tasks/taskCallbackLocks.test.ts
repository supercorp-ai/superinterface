import assert from 'node:assert/strict'
import { after, beforeEach, describe, it, mock } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { callRoute } from '../../lib/http/callRoute'
import { startFakeQstash } from '../../lib/qstash/startFakeQstash'

// In tests (and other non-production environments) the callback guards task
// execution with an in-process lock instead of Redis. Each lease lasts 15
// minutes. These tests deliver the same task again while a delivery is still
// executing, by building the callback with a task executor that triggers the
// second delivery mid-run.

const NOW = new Date('2030-01-07T12:00:00.000Z')
const LEASE_MS = 15 * 60 * 1000
const CALLBACK_URL = 'https://self-hosted.test/api/tasks/callback'

const fakeQstash = await startFakeQstash()
process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'

mock.timers.enable({ apis: ['Date'], now: NOW })

const { buildPOST } = await import(
  '../../../src/app/api/tasks/callback/buildRoute'
)

beforeEach(() => {
  fakeQstash.reset()
  mock.timers.setTime(NOW.getTime())
})

after(async () => {
  mock.timers.reset()
  await fakeQstash.close()
})

const createDueTask = async () => {
  const { thread } = await createTaskTestContext()
  return createTestTask({
    data: {
      threadId: thread.id,
      schedule: {
        start: '2030-01-07T11:00:00Z',
        recurrenceRules: [{ frequency: 'daily' }],
      },
      qstashMessageId: 'msg_current',
    },
  })
}

describe('task callback execution lock', () => {
  it('lets a delivery take over a lease that expired mid-run without the stale run releasing it', async () => {
    const task = await createDueTask()
    const nestedResponses: Array<{ status: number; json: unknown }> = []
    let executions = 0

    const callbackRoute: { POST: (request: Request) => Promise<Response> } = {
      POST: buildPOST({
        prisma,
        callbackUrl: CALLBACK_URL,
        taskExecutor: async () => {
          executions += 1
          if (executions > 1) return null

          // While the first run holds the lease, a retry is turned away.
          nestedResponses.push(await deliver())

          // Once the lease has expired, the retry runs and reschedules.
          mock.timers.setTime(NOW.getTime() + LEASE_MS + 1000)
          nestedResponses.push(await deliver())

          return null
        },
      }),
    }

    const deliver = () =>
      callRoute({
        appHandler: callbackRoute,
        method: 'POST',
        headers: { 'Upstash-Message-Id': 'msg_current' },
        body: { taskId: task.id },
      })

    const response = await deliver()

    assert.deepEqual(
      nestedResponses.map(({ status, json }) => ({ status, json })),
      [
        { status: 503, json: { error: 'Task execution already in progress' } },
        { status: 200, json: { ok: true } },
      ],
    )
    // The retry queued the next occurrence, so the first run stands down.
    assert.deepEqual(response.json, { ok: true, ignored: 'task_changed' })
    assert.equal(executions, 2)
    assert.equal(fakeQstash.publishes.length, 1)
    assert.equal(fakeQstash.publishes[0].destination, CALLBACK_URL)

    // Both leases are gone: the next delivery is not locked out.
    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    const next = await callRoute({
      appHandler: callbackRoute,
      method: 'POST',
      headers: { 'Upstash-Message-Id': dbTask.qstashMessageId ?? '' },
      body: { taskId: task.id },
    })
    assert.deepEqual(next.json, { ok: true })
    assert.equal(executions, 3)
  })
})
