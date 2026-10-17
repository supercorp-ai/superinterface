import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, afterEach, beforeEach, describe, it, mock } from 'node:test'
import {
  HandlerType,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTaskTestContext } from '../../lib/tasks/createTaskTestContext'
import { createTaskToolFunctions } from '../../lib/tasks/createTaskToolFunctions'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { createTestHandlerFunction } from '../../lib/functions/createTestHandlerFunction'
import { callRoute } from '../../lib/http/callRoute'
import { startFakeQstash } from '../../lib/qstash/startFakeQstash'
import { startFakeRedisWithLocks } from '../../lib/redis/startFakeRedisWithLocks'
import {
  startFakeJsonServer,
  type FakeHttpRequest,
  type FakeHttpResponse,
} from '../../lib/http/startFakeJsonServer'
import { startFakeLlm, type FakeLlmReply } from '../../lib/llm/startFakeLlm'
import { toolOutputs } from '../../lib/llm/toolOutputs'

// QStash calls /api/tasks/callback when a task is due. The route posts the
// task message to the thread, runs the assistant to completion and queues the
// next occurrence. Everything external is faked locally: QStash, Upstash
// Redis, the model (fake LLM) and the OpenAI Assistants API.

const CALLBACK_URL = 'https://superinterface.test/api/cloud/tasks/callback'

const fakeQstash = await startFakeQstash()
const fakeRedis = await startFakeRedisWithLocks()

let openaiHandler: (request: FakeHttpRequest) => FakeHttpResponse = () => ({
  status: 404,
  json: { error: { message: 'not found' } },
})
const fakeOpenai = await startFakeJsonServer({
  handle: (request) => openaiHandler(request),
})

process.env.QSTASH_URL = fakeQstash.baseURL
process.env.QSTASH_TOKEN = 'test-qstash-token'
process.env.UPSTASH_REDIS_REST_URL = fakeRedis.baseURL
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token'
process.env.OPENAI_BASE_URL = `${fakeOpenai.baseURL}/v1`
process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL = 'https://superinterface.test'

const callbackRoute = await import('../../../src/app/api/tasks/callback/route')

const fakeLlms: Array<Awaited<ReturnType<typeof startFakeLlm>>> = []

beforeEach(() => {
  fakeQstash.reset()
  fakeOpenai.requests.length = 0
})

after(async () => {
  await Promise.all(fakeLlms.map((fakeLlm) => fakeLlm.close()))
  await Promise.all([fakeQstash.close(), fakeRedis.close(), fakeOpenai.close()])
})

const inHours = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

const deliver = ({
  taskId,
  messageId,
}: {
  taskId: string
  messageId?: string
}) =>
  callRoute({
    appHandler: callbackRoute,
    method: 'POST',
    headers: messageId ? { 'Upstash-Message-Id': messageId } : {},
    body: { taskId },
  })

// An assistant on the fake LLM with a due task on its thread. `replies` may
// depend on the task id, which is only known once the task exists.
const setupDueTask = async ({
  replies,
  schedule = {
    start: inHours(-22),
    recurrenceRules: [{ frequency: 'daily' }],
  },
  taskTools = false,
}: {
  replies: (args: { taskId: string }) => FakeLlmReply[]
  schedule?: unknown
  taskTools?: boolean
}) => {
  let scripted: FakeLlmReply[] = []
  const fakeLlm = await startFakeLlm({
    respond: ({ index }) => scripted[index] ?? { content: 'Done.' },
  })
  fakeLlms.push(fakeLlm)
  const context = await createTaskTestContext({ endpoint: fakeLlm.baseURL })
  if (taskTools) {
    await createTaskToolFunctions({ assistantId: context.assistant.id })
  }
  const task = await createTestTask({
    data: {
      threadId: context.thread.id,
      message: 'Send the daily summary',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schedule: schedule as any,
      qstashMessageId: 'msg_current',
    },
  })
  scripted = replies({ taskId: task.id })

  return { ...context, fakeLlm, task }
}

const waitForLog = async ({ message }: { message: string }) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const log = await prisma.log.findFirst({ where: { message } })
    if (log) return log
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return null
}

describe('task callback delivery guards', () => {
  it('acknowledges a delivery for a task that no longer exists', async () => {
    const response = await deliver({ taskId: randomUUID() })

    assert.equal(response.status, 200)
    assert.deepEqual(response.json, { ok: true, ignored: 'task_deleted' })
  })

  it('acknowledges a superseded delivery without running the task', async () => {
    const { task, fakeLlm } = await setupDueTask({ replies: () => [] })

    const response = await deliver({ taskId: task.id, messageId: 'msg_old' })

    assert.deepEqual(response.json, { ok: true, ignored: 'stale_delivery' })
    assert.equal(fakeLlm.completionRequests().length, 0)
  })
})

describe('running a due task', () => {
  it('posts the task message, runs the assistant and queues the next occurrence', async () => {
    const { task, thread, fakeLlm } = await setupDueTask({
      replies: () => [{ content: 'Here is your summary.' }],
    })

    const response = await deliver({
      taskId: task.id,
      messageId: 'msg_current',
    })

    assert.equal(response.status, 200)
    assert.deepEqual(response.json, { ok: true })

    const [completion] = fakeLlm.completionRequests()
    assert.deepEqual(
      completion.body.messages.map(
        ({ role, content }: { role: string; content: unknown }) => ({
          role,
          content,
        }),
      ),
      [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'Send the daily summary' },
      ],
    )

    const messages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    })
    assert.deepEqual(
      messages.map(({ role }) => role),
      ['USER', 'ASSISTANT'],
    )
    assert.deepEqual(messages[0].metadata, {
      superinterfaceCreatedByType: 'TASK',
      superinterfaceCreatedById: task.id,
    })

    assert.equal(fakeQstash.publishes.length, 1)
    const [publish] = fakeQstash.publishes
    assert.equal(publish.destination, CALLBACK_URL)
    assert.deepEqual(publish.body, { taskId: task.id })
    const delaySeconds = Number(publish.headers['upstash-delay'].slice(0, -1))
    assert.ok(Math.abs(delaySeconds - 2 * 60 * 60) <= 5, `${delaySeconds}`)

    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    assert.equal(dbTask.qstashMessageId, publish.messageId)
  })

  it('runs a manual delivery without a message id', async () => {
    const { task } = await setupDueTask({ replies: () => [{ content: 'Ok.' }] })

    const response = await deliver({ taskId: task.id })

    assert.deepEqual(response.json, { ok: true })
  })

  it('does not queue anything after the last occurrence of a one-off task', async () => {
    const { task } = await setupDueTask({
      replies: () => [{ content: 'Done.' }],
      schedule: { start: inHours(-0.01) },
    })

    const response = await deliver({
      taskId: task.id,
      messageId: 'msg_current',
    })

    assert.deepEqual(response.json, { ok: true })
    assert.equal(fakeQstash.publishes.length, 0)
  })

  it('stops when the assistant deletes the task during the run', async () => {
    const { task, fakeLlm } = await setupDueTask({
      taskTools: true,
      replies: ({ taskId }) => [
        { toolCalls: [{ name: 'delete_task', arguments: { taskId } }] },
        { content: 'Deleted.' },
      ],
    })

    const response = await deliver({
      taskId: task.id,
      messageId: 'msg_current',
    })

    assert.deepEqual(response.json, { ok: true, ignored: 'task_deleted' })
    const [, followUp] = fakeLlm.completionRequests()
    assert.equal(
      JSON.parse(toolOutputs({ request: followUp })[0].output ?? '').task.id,
      task.id,
    )
    assert.deepEqual(fakeQstash.deletes, ['msg_current'])
    assert.equal(fakeQstash.publishes.length, 0)
  })

  it('leaves the schedule alone when the assistant reschedules the task during the run', async () => {
    const start = inHours(6)
    const { task, fakeLlm } = await setupDueTask({
      taskTools: true,
      replies: ({ taskId }) => [
        {
          toolCalls: [
            {
              name: 'update_task',
              arguments: { taskId, schedule: { start } },
            },
          ],
        },
        { content: 'Moved.' },
      ],
    })

    const response = await deliver({
      taskId: task.id,
      messageId: 'msg_current',
    })

    assert.deepEqual(response.json, { ok: true, ignored: 'task_changed' })

    // The tool cancelled the current delivery, stored the new schedule and
    // returned the updated task to the model.
    assert.deepEqual(fakeQstash.deletes, ['msg_current'])
    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    assert.deepEqual(dbTask.schedule, { start })
    assert.equal(dbTask.message, 'Send the daily summary')
    const [, followUp] = fakeLlm.completionRequests()
    const [{ output }] = toolOutputs({ request: followUp })
    assert.deepEqual(JSON.parse(output ?? '').task.schedule, { start })

    // Only the update tool queued a delivery; the callback did not add one.
    assert.equal(fakeQstash.publishes.length, 1)
    assert.deepEqual(fakeQstash.publishes[0].body, { taskId: task.id })
    assert.equal(dbTask.qstashMessageId, fakeQstash.publishes[0].messageId)
  })

  it('answers client tool calls automatically because no client is attached', async () => {
    const { task, assistant, fakeLlm } = await setupDueTask({
      replies: () => [
        { toolCalls: [{ name: 'show_banner', arguments: { text: 'Hi' } }] },
        { content: 'Shown.' },
      ],
    })
    await createTestHandlerFunction({
      assistantId: assistant.id,
      name: 'show_banner',
      type: HandlerType.CLIENT_TOOL,
      handler: {
        clientToolHandler: {
          create: { name: 'showBanner', arguments: {} },
        },
      },
    })

    const response = await deliver({
      taskId: task.id,
      messageId: 'msg_current',
    })

    assert.deepEqual(response.json, { ok: true })
    const [, followUp] = fakeLlm.completionRequests()
    assert.deepEqual(toolOutputs({ request: followUp }), [
      {
        name: 'show_banner',
        output: 'Client tools cannot be used during tasks',
      },
    ])
    const outputSet = fakeRedis.commands.find(
      ([name, key]) =>
        name === 'set' &&
        String(key).startsWith('submit-client-tool-outputs:output:'),
    )
    assert.deepEqual(outputSet?.slice(2), [
      'Client tools cannot be used during tasks',
      'ex',
      60 * 60 * 24 * 7,
    ])

    // The task message started the run on the thread.
    const userMessage = await prisma.message.findFirstOrThrow({
      where: { threadId: task.threadId, role: 'USER' },
    })
    assert.deepEqual(userMessage.metadata, {
      superinterfaceCreatedByType: 'TASK',
      superinterfaceCreatedById: task.id,
    })

    // The task is unchanged after the run, so its next occurrence is queued.
    assert.equal(fakeQstash.publishes.length, 1)
    const [publish] = fakeQstash.publishes
    assert.equal(publish.destination, CALLBACK_URL)
    assert.deepEqual(publish.body, { taskId: task.id })
    const dbTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
    })
    assert.equal(dbTask.qstashMessageId, publish.messageId)
  })
})

describe('task callback failures', () => {
  // The route logs the underlying SDK errors with console.log.
  let consoleLog: ReturnType<typeof mock.method> | undefined
  beforeEach(() => {
    consoleLog = mock.method(console, 'log', () => undefined)
  })
  afterEach(() => {
    consoleLog?.mock.restore()
  })

  // The error row the route wrote for the failed delivery.
  const expectFailureLog = async ({
    message,
    assistantId,
    threadId,
  }: {
    message: string
    assistantId: string
    threadId: string
  }) => {
    const log = await waitForLog({ message })
    assert.deepEqual(
      {
        requestMethod: log?.requestMethod,
        requestRoute: log?.requestRoute,
        level: log?.level,
        status: log?.status,
        assistantId: log?.assistantId,
        threadId: log?.threadId,
      },
      {
        requestMethod: 'POST',
        requestRoute: 'MESSAGES',
        level: 'ERROR',
        status: 500,
        assistantId,
        threadId,
      },
    )
  }

  const openaiAssistant = async ({
    threadData = {},
  }: {
    threadData?: Record<string, unknown>
  } = {}) => {
    const context = await createTaskTestContext({
      modelProviderType: ModelProviderType.OPENAI,
      storageProviderType: StorageProviderType.OPENAI,
      assistantData: { openaiAssistantId: 'asst_fake' },
      threadData,
    })
    const task = await createTestTask({
      data: {
        threadId: context.thread.id,
        message: 'Check in',
        schedule: { start: inHours(-0.01) },
      },
    })
    return { ...context, task }
  }

  it('fails when an OpenAI thread cannot be created', async () => {
    openaiHandler = () => ({
      status: 400,
      json: { error: { message: 'threads are down' } },
    })
    const { task, thread } = await openaiAssistant()

    const response = await deliver({ taskId: task.id })

    assert.equal(response.status, 500)
    assert.deepEqual(response.json, {
      error: 'Failed to get managed openai thread id.',
    })
    assert.deepEqual(
      fakeOpenai.requests.map(({ method, path }) => `${method} ${path}`),
      ['POST /v1/threads'],
    )
    const log = await waitForLog({
      message: 'Failed to get managed openai thread id: 400 threads are down',
    })
    assert.equal(log?.threadId, thread.id)
  })

  it('creates the OpenAI thread on demand and fails when the message is rejected', async () => {
    openaiHandler = ({ path }) => {
      if (path === '/v1/threads') {
        return {
          status: 200,
          json: {
            id: 'thread_fake',
            object: 'thread',
            created_at: 0,
            metadata: {},
          },
        }
      }
      return { status: 400, json: { error: { message: 'no messages' } } }
    }
    const { task, thread, assistant } = await openaiAssistant()

    const response = await deliver({ taskId: task.id })

    assert.equal(response.status, 500)
    assert.deepEqual(response.json, { error: 'Failed to create message' })
    // The route logs the SDK error itself as console.log({ error }).
    const loggedErrors = consoleLog!.mock.calls
      .map(({ arguments: [logged] }) => logged as { error?: Error })
      .filter((logged) => logged?.error)
      .map(({ error }) => error?.message)
    assert.deepEqual(loggedErrors, ['400 no messages'])
    await expectFailureLog({
      message: 'Failed to create message: 400 no messages',
      assistantId: assistant.id,
      threadId: thread.id,
    })
    assert.deepEqual(
      fakeOpenai.requests.map(({ method, path }) => `${method} ${path}`),
      ['POST /v1/threads', 'POST /v1/threads/thread_fake/messages'],
    )
    assert.equal(fakeOpenai.requests[1].body.content, 'Check in')
    const dbThread = await prisma.thread.findUniqueOrThrow({
      where: { id: thread.id },
    })
    assert.equal(dbThread.openaiThreadId, 'thread_fake')
  })

  it('fails when the run cannot be started', async () => {
    openaiHandler = ({ path }) => {
      if (path.endsWith('/messages')) {
        return {
          status: 200,
          json: {
            id: 'msg_fake',
            object: 'thread.message',
            created_at: 0,
            thread_id: 'thread_existing',
            role: 'user',
            content: [],
            metadata: {},
          },
        }
      }
      return { status: 400, json: { error: { message: 'no runs' } } }
    }
    const { task, thread, assistant } = await openaiAssistant({
      threadData: { openaiThreadId: 'thread_existing' },
    })

    const response = await deliver({ taskId: task.id })

    assert.equal(response.status, 500)
    assert.deepEqual(response.json, { error: 'Failed to create run stream' })
    // The route logs the SDK error itself as console.log({ error }).
    const loggedErrors = consoleLog!.mock.calls
      .map(({ arguments: [logged] }) => logged as { error?: Error })
      .filter((logged) => logged?.error)
      .map(({ error }) => error?.message)
    assert.deepEqual(loggedErrors, ['400 no runs'])
    await expectFailureLog({
      message: 'Failed to create run stream: 400 no runs',
      assistantId: assistant.id,
      threadId: thread.id,
    })
    assert.deepEqual(
      fakeOpenai.requests.map(({ method, path }) => `${method} ${path}`),
      [
        'POST /v1/threads/thread_existing/messages',
        'POST /v1/threads/thread_existing/runs',
      ],
    )
    assert.equal(fakeOpenai.requests[1].body.assistant_id, 'asst_fake')
  })

  it('fails for a Responses thread that has no conversation yet', async () => {
    const context = await createTaskTestContext({
      modelProviderType: ModelProviderType.OPENAI,
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
    })
    const task = await createTestTask({
      data: {
        threadId: context.thread.id,
        schedule: { start: inHours(-0.01) },
      },
    })

    const response = await deliver({ taskId: task.id })

    assert.equal(response.status, 500)
    assert.deepEqual(response.json, { error: 'Invalid thread configuration.' })
    assert.equal(fakeOpenai.requests.length, 0)
    assert.ok(await waitForLog({ message: 'Invalid thread configuration.' }))
  })
})
