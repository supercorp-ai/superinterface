import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { callRoute } from '../../lib/http/callRoute'
import { serveFetchHandler } from '../../lib/http/serveFetchHandler'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'

// Self-hosted deployments build the task routes with the in-process local
// scheduler instead of QStash. Due tasks are then delivered by a timer that
// POSTs to the callback URL, which here is the real callback route served on
// a local port.

process.env.QSTASH_TOKEN = 'unused-qstash-token'

const { createLocalScheduler } = await import(
  '../../../src/lib/tasks/schedulers'
)
const tasksBuilders = await import('../../../src/app/api/tasks/buildRoute')
const taskBuilders = await import(
  '../../../src/app/api/tasks/[taskId]/buildRoute'
)
const callbackBuilders = await import(
  '../../../src/app/api/tasks/callback/buildRoute'
)

const fakeLlm = await startFakeLlm({
  respond: () => ({ content: 'Reminder delivered.' }),
})
const scheduler = createLocalScheduler()
const callbackServer = await serveFetchHandler({
  handler: callbackBuilders.buildPOST({ prisma, scheduler }),
})
const callbackUrl = `${callbackServer.url}/api/tasks/callback`

const tasksRoute = {
  POST: tasksBuilders.buildPOST({ prisma, scheduler, callbackUrl }),
}
const taskRoute = {
  PATCH: taskBuilders.buildPATCH({ prisma, scheduler, callbackUrl }),
  DELETE: taskBuilders.buildDELETE({ prisma, scheduler }),
}

after(async () => {
  scheduler.dispose()
  await Promise.all([callbackServer.close(), fakeLlm.close()])
})

const inSeconds = (seconds: number) =>
  new Date(Date.now() + seconds * 1000).toISOString()

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const waitFor = async ({
  check,
  timeoutMs = 5000,
}: {
  check: () => Promise<boolean>
  timeoutMs?: number
}) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return true
    await sleep(50)
  }
  return false
}

const assistantReplies = ({ threadId }: { threadId: string }) =>
  prisma.message.count({ where: { threadId, role: 'ASSISTANT' } })

describe('tasks with the local scheduler', () => {
  it('delivers a due task to the callback, which runs the assistant', async () => {
    const { authorization, thread } = await createTaskTestContext({
      endpoint: fakeLlm.baseURL,
    })

    const response = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Soon',
        message: 'Ping me',
        threadId: thread.id,
        schedule: { start: inSeconds(2) },
      },
    })
    assert.equal(response.status, 200)

    assert.ok(
      await waitFor({
        check: async () =>
          (await assistantReplies({ threadId: thread.id })) === 1,
      }),
    )
    const userMessage = await prisma.message.findFirstOrThrow({
      where: { threadId: thread.id, role: 'USER' },
    })
    assert.deepEqual(userMessage.metadata, {
      superinterfaceCreatedByType: 'TASK',
      superinterfaceCreatedById: response.json.task.id,
    })
    assert.ok(
      await waitFor({
        check: async () =>
          callbackServer.responses.some(({ body }) => body === '{"ok":true}'),
      }),
    )
  })

  it('moves a pending delivery when the task is rescheduled', async () => {
    const { authorization, thread } = await createTaskTestContext({
      endpoint: fakeLlm.baseURL,
    })
    const created = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Later',
        message: 'Ping me later',
        threadId: thread.id,
        schedule: { start: inSeconds(3600) },
      },
    })

    const updated = await callRoute({
      appHandler: taskRoute,
      method: 'PATCH',
      params: { taskId: created.json.task.id },
      authorization,
      body: { schedule: { start: inSeconds(2) } },
    })
    assert.equal(updated.status, 200)

    assert.ok(
      await waitFor({
        check: async () =>
          (await assistantReplies({ threadId: thread.id })) === 1,
      }),
    )
  })

  it('cancels the pending delivery when the task is deleted', async () => {
    const { authorization, thread } = await createTaskTestContext({
      endpoint: fakeLlm.baseURL,
    })
    const created = await callRoute({
      appHandler: tasksRoute,
      method: 'POST',
      authorization,
      body: {
        title: 'Cancelled',
        message: 'Never',
        threadId: thread.id,
        schedule: { start: inSeconds(2) },
      },
    })

    // The local scheduler queued a delivery for the task.
    assert.equal(created.status, 200)
    const pending = await prisma.task.findUniqueOrThrow({
      where: { id: created.json.task.id },
    })
    assert.match(pending.qstashMessageId ?? '', /^[0-9a-f-]{36}$/)

    const deliveries = callbackServer.responses.length
    const deleted = await callRoute({
      appHandler: taskRoute,
      method: 'DELETE',
      params: { taskId: created.json.task.id },
      authorization,
    })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.json.task.id, created.json.task.id)
    assert.equal(
      await prisma.task.findUnique({ where: { id: created.json.task.id } }),
      null,
    )

    await sleep(2500)
    assert.equal(callbackServer.responses.length, deliveries)
    assert.equal(
      await prisma.message.count({ where: { threadId: thread.id } }),
      0,
    )
  })
})
