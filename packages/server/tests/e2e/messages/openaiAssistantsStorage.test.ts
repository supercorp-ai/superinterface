import assert from 'node:assert'
import { after, afterEach, before, describe, it } from 'node:test'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  MessageRole,
  Prisma,
  StorageProviderType,
  TruncationType,
} from '@prisma/client'
import { testApiHandler } from 'next-test-api-route-handler'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { createTestThread } from '../../lib/threads/createTestThread'
import {
  fakeRun,
  startFakeOpenai,
  type FakeOpenaiHandler,
} from '../../lib/openai/startFakeOpenai'
import { postMessage } from '../../lib/messages/postMessage'
import { waitForLog } from '../../lib/logs/waitForLog'
import { waitFor } from '../../lib/async/waitFor'

describe('POST /api/messages on OpenAI Assistants storage', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>
  let override: FakeOpenaiHandler | undefined

  before(async () => {
    fakeOpenai = await startFakeOpenai({
      handle: (args) => override?.(args),
    })
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  afterEach(() => {
    override = undefined
  })

  after(async () => {
    await fakeOpenai.close()
  })

  const openaiAssistant = ({
    assistant = {},
  }: {
    assistant?: Partial<Prisma.AssistantUncheckedCreateInput>
  } = {}) =>
    createPublicAssistant({
      assistant: {
        storageProviderType: StorageProviderType.OPENAI,
        openaiAssistantId: 'asst_openai',
        modelSlug: 'gpt-fake',
        instructions: '',
        ...assistant,
      },
    })

  const requestsForThread = ({
    method,
    threadId,
    suffix,
  }: {
    method: string
    threadId: string
    suffix: string
  }) => fakeOpenai.find({ method, path: `/threads/${threadId}${suffix}` })

  const fail = ({
    method,
    path,
    status = 400,
    message,
  }: {
    method: string
    path: RegExp
    status?: number
    message: string
  }): FakeOpenaiHandler => {
    return ({ request }) => {
      if (request.method !== method || !path.test(request.path)) {
        return undefined
      }

      return { type: 'json', status, json: { error: { message } } }
    }
  }

  it('creates a remote thread, message and run for a new conversation', async () => {
    const { assistant, publicApiKey } = await openaiAssistant()
    await prisma.initialMessage.createMany({
      data: [
        {
          assistantId: assistant.id,
          role: MessageRole.ASSISTANT,
          content: 'Welcome!',
          orderNumber: 0,
        },
        {
          assistantId: assistant.id,
          role: MessageRole.USER,
          content: 'Hi!',
          orderNumber: 1,
        },
      ],
    })
    const attachments = [{ file_id: 'file-abc', tools: [] }]

    const { status, events } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        content: 'Hello assistants',
        attachments,
        plan: 'pro',
      },
    })

    assert.strictEqual(status, 200)
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
    })
    assert.match(thread.openaiThreadId ?? '', /^thread_/)
    assert.deepStrictEqual(thread.metadata, {
      assistantId: assistant.id,
      threadId: thread.id,
      plan: 'pro',
    })

    const [threadCreate] = fakeOpenai.find({ method: 'POST', path: '/threads' })
    assert.deepStrictEqual(
      threadCreate.body.messages.map(
        ({ role, content }: { role: string; content: string }) => [
          role,
          content,
        ],
      ),
      [
        ['assistant', 'Welcome!'],
        ['user', 'Hi!'],
      ],
    )
    assert.deepStrictEqual(threadCreate.body.metadata, thread.metadata)

    const [messageCreate] = requestsForThread({
      method: 'POST',
      threadId: thread.openaiThreadId!,
      suffix: '/messages',
    })
    assert.deepStrictEqual(messageCreate.body, {
      role: 'user',
      content: 'Hello assistants',
      attachments,
      metadata: { plan: 'pro' },
    })

    const [runCreate] = requestsForThread({
      method: 'POST',
      threadId: thread.openaiThreadId!,
      suffix: '/runs',
    })
    assert.strictEqual(runCreate.body.assistant_id, 'asst_openai')
    assert.strictEqual(runCreate.body.stream, true)
    assert.strictEqual(runCreate.body.model, 'gpt-fake')
    assert.ok(!('instructions' in runCreate.body))
    assert.deepStrictEqual(runCreate.body.truncation_strategy, {
      type: 'auto',
    })

    const created = events.find(({ event }) => event === 'thread.created')
    assert.strictEqual(created?.data.id, thread.openaiThreadId)
    const completed = events.find(
      ({ event }) => event === 'thread.message.completed',
    )
    assert.strictEqual(
      completed?.data.content[0].text.value,
      'Hello from the fake Assistants API.',
    )
    // A completed run leaves nothing to cancel when the stream closes.
    assert.ok(!fakeOpenai.requests.some(({ path }) => path.endsWith('/cancel')))
  })

  it('sends instructions and the configured truncation strategy', async () => {
    const cases = [
      {
        assistant: {
          instructions: 'Be helpful.',
          truncationType: TruncationType.LAST_MESSAGES,
          truncationLastMessagesCount: 4,
        },
        expected: {
          instructions: 'Be helpful.',
          truncation_strategy: { type: 'last_messages', last_messages: 4 },
        },
      },
      {
        assistant: { truncationType: TruncationType.DISABLED },
        expected: {
          instructions: undefined,
          truncation_strategy: { type: 'disabled' },
        },
      },
    ]

    for (const { assistant: assistantData, expected } of cases) {
      const { assistant, publicApiKey } = await openaiAssistant({
        assistant: assistantData,
      })
      const thread = await createTestThread({
        data: {
          assistantId: assistant.id,
          openaiThreadId: `thread_${assistant.id}`,
        },
      })

      const { status, events } = await postMessage({
        body: {
          assistantId: assistant.id,
          publicApiKey,
          threadId: thread.id,
          content: 'Hi',
          attachments: [],
        },
      })

      assert.strictEqual(status, 200)
      assert.ok(!events.some(({ event }) => event === 'thread.created'))
      const [messageCreate] = requestsForThread({
        method: 'POST',
        threadId: thread.openaiThreadId!,
        suffix: '/messages',
      })
      assert.ok(!('attachments' in messageCreate.body))
      const [runCreate] = requestsForThread({
        method: 'POST',
        threadId: thread.openaiThreadId!,
        suffix: '/runs',
      })
      assert.strictEqual(runCreate.body.instructions, expected.instructions)
      assert.deepStrictEqual(
        runCreate.body.truncation_strategy,
        expected.truncation_strategy,
      )
    }
  })

  it('fails when the remote thread cannot be created', async (t) => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    override = fail({
      method: 'POST',
      path: /^\/threads$/,
      message: 'Threads are down',
    })
    const consoleDir = t.mock.method(console, 'dir', () => undefined)

    const { status, json } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, { error: 'Failed to create thread.' })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to create thread: /,
    })
    assert.strictEqual(
      log.message,
      'Failed to create thread: 400 Threads are down',
    )
    assert.strictEqual(log.assistantId, assistant.id)
    assert.strictEqual(consoleDir.mock.callCount(), 1)
    const [threadError, options] = consoleDir.mock.calls[0].arguments
    assert.strictEqual(threadError.status, 400)
    assert.strictEqual(threadError.message, '400 Threads are down')
    assert.deepStrictEqual(options, { depth: null })
  })

  it('creates a managed remote thread for a thread that has none', async () => {
    const { assistant, publicApiKey } = await openaiAssistant()
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })

    const { status } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: thread.id,
        content: 'Hi',
      },
    })

    assert.strictEqual(status, 200)
    const [threadCreate] = fakeOpenai
      .find({ method: 'POST', path: '/threads' })
      .filter(({ body }) => body.metadata?.threadId === thread.id)
    assert.deepStrictEqual(threadCreate.body.metadata, {
      assistantId: assistant.id,
      threadId: thread.id,
    })
    const updated = await prisma.thread.findUniqueOrThrow({
      where: { id: thread.id },
    })
    assert.match(updated.openaiThreadId ?? '', /^thread_/)
    assert.strictEqual(updated.openaiConversationId, null)
    assert.strictEqual(
      requestsForThread({
        method: 'POST',
        threadId: updated.openaiThreadId!,
        suffix: '/runs',
      }).length,
      1,
    )
  })

  it('fails when the managed remote thread cannot be created', async () => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })
    override = fail({
      method: 'POST',
      path: /^\/threads$/,
      message: 'No more threads',
    })

    const { status, json } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: thread.id,
        content: 'Hi',
      },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, {
      error: 'Failed to get managed openai thread id.',
    })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to get managed openai thread id: /,
    })
    assert.strictEqual(log.threadId, thread.id)
  })

  it('fails when the message cannot be created', async (t) => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    override = fail({
      method: 'POST',
      path: /^\/threads\/[^/]+\/messages$/,
      message: 'Message rejected',
    })
    const consoleLog = t.mock.method(console, 'log', () => undefined)

    const { status, json } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, { error: 'Failed to create message.' })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to create message: /,
    })
    assert.strictEqual(
      log.message,
      'Failed to create message: 400 Message rejected',
    )
    // The route logs the error, then createLog reports writing the log row.
    await waitFor({ check: () => consoleLog.mock.callCount() >= 3 })
    const [[logged], ...createLogLines] = consoleLog.mock.calls.map(
      ({ arguments: args }) => args,
    )
    assert.deepStrictEqual(Object.keys(logged), ['error'])
    assert.strictEqual(logged.error.status, 400)
    assert.strictEqual(logged.error.message, '400 Message rejected')
    assert.deepStrictEqual(createLogLines, [
      ['Logging error.'],
      ['Successfully logged error.'],
    ])
  })

  it('fails when the run cannot be started', async (t) => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    override = fail({
      method: 'POST',
      path: /^\/threads\/[^/]+\/runs$/,
      message: 'Run rejected',
    })
    const consoleError = t.mock.method(console, 'error', () => undefined)

    const { status, json } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, { error: 'Failed to create run stream.' })
    await waitForLog({
      workspaceId: workspace.id,
      message: 'Failed to create run stream: 400 Run rejected',
    })
    assert.strictEqual(consoleError.mock.callCount(), 1)
    const [runError] = consoleError.mock.calls[0].arguments
    assert.strictEqual(runError.status, 400)
    assert.strictEqual(runError.message, '400 Run rejected')
  })

  it('logs the cause when the run connection drops', async () => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    override = ({ request }) => {
      if (request.method !== 'POST') return undefined
      if (!/^\/threads\/[^/]+\/runs$/.test(request.path)) return undefined
      return { type: 'destroy' }
    }

    const { status, json } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, { error: 'Failed to create run stream.' })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to create run stream: Connection error\. /,
    })
    assert.ok(
      log.message.length >
        'Failed to create run stream: Connection error. '.length,
    )
  })

  it('logs failed runs with and without error details', async () => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    let attempt = 0
    override = ({ request }) => {
      if (request.method !== 'POST') return undefined
      const match = request.path.match(/^\/threads\/([^/]+)\/runs$/)
      if (!match) return undefined
      attempt += 1
      const run = fakeRun({ threadId: match[1], status: 'failed' })

      if (attempt === 1) {
        return {
          type: 'sse',
          events: [
            {
              event: 'thread.run.failed',
              data: {
                ...run,
                id: 'run_detailed',
                last_error: {
                  code: 'rate_limit_exceeded',
                  message: 'Slow down',
                },
              },
            },
          ],
        }
      }

      return {
        type: 'sse',
        events: [
          {
            event: 'thread.run.failed',
            data: { ...run, id: '', last_error: null },
          },
        ],
      }
    }

    for (const content of ['first', 'second']) {
      const { status, events } = await postMessage({
        body: { assistantId: assistant.id, publicApiKey, content },
      })

      assert.strictEqual(status, 200)
      assert.ok(events.some(({ event }) => event === 'thread.run.failed'))
    }

    await waitForLog({
      workspaceId: workspace.id,
      message:
        'Thread Run failed: Slow down (code: rate_limit_exceeded) [run: run_detailed]',
    })
    await waitForLog({
      workspaceId: workspace.id,
      message: 'Thread Run failed: Unknown error',
    })
    assert.ok(!fakeOpenai.requests.some(({ path }) => path.endsWith('/cancel')))
  })

  it('cancels a run that was still in progress when the stream ended', async (t) => {
    const { assistant, publicApiKey } = await openaiAssistant()
    const consoleWarn = t.mock.method(console, 'warn', () => undefined)
    let cancelStatus = 200
    override = ({ request }) => {
      if (request.method !== 'POST') return undefined
      if (request.path.endsWith('/cancel')) {
        if (cancelStatus === 200) return undefined
        return {
          type: 'json',
          status: cancelStatus,
          json: { error: { message: 'Cannot cancel a completed run' } },
        }
      }
      const match = request.path.match(/^\/threads\/([^/]+)\/runs$/)
      if (!match) return undefined
      const run = fakeRun({ threadId: match[1], runId: `run_${cancelStatus}` })

      return {
        type: 'sse',
        events: [
          { event: 'thread.run.created', data: { ...run, status: 'queued' } },
          { event: 'thread.run.in_progress', data: run },
        ],
      }
    }

    const { status } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })
    assert.strictEqual(status, 200)

    const cancel = await waitFor({
      check: () =>
        fakeOpenai.find({
          method: 'POST',
          path: /^\/threads\/[^/]+\/runs\/run_200\/cancel$/,
        })[0],
    })
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
    })
    assert.strictEqual(
      cancel.path,
      `/threads/${thread.openaiThreadId}/runs/run_200/cancel`,
    )

    cancelStatus = 409
    const second = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: thread.id,
        content: 'Again',
      },
    })

    assert.strictEqual(second.status, 200)
    assert.ok(second.events.some(({ event }) => event === 'thread.run.created'))
    await waitFor({
      check: () =>
        fakeOpenai.find({
          method: 'POST',
          path: /\/runs\/run_409\/cancel$/,
        }).length,
    })
    // A rejected cancel is only warned about.
    await waitFor({ check: () => consoleWarn.mock.callCount() })
    assert.deepStrictEqual(
      consoleWarn.mock.calls.map(({ arguments: args }) => args),
      [
        [
          'cancel-on-disconnect: ignoring upstream cancel error',
          '409 Cannot cancel a completed run',
        ],
      ],
    )
  })

  it('does not cancel a run that completed after being in progress', async () => {
    const { assistant, publicApiKey } = await openaiAssistant()
    override = ({ request }) => {
      if (request.method !== 'POST') return undefined
      const match = request.path.match(/^\/threads\/([^/]+)\/runs$/)
      if (!match) return undefined
      const run = fakeRun({ threadId: match[1], runId: 'run_completed' })

      return {
        type: 'sse',
        events: [
          { event: 'thread.run.created', data: { ...run, status: 'queued' } },
          { event: 'thread.run.in_progress', data: run },
          {
            event: 'thread.run.completed',
            data: { ...run, status: 'completed' },
          },
        ],
      }
    }

    const { status, events } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(
      events
        .filter(({ event }) => event.startsWith('thread.run.'))
        .map(({ event, data }) => [event, data.id]),
      [['thread.run.created', 'run_completed']],
    )
    // The run completed, so nothing is left to cancel once the stream ends.
    await sleep(200)
    assert.deepStrictEqual(
      fakeOpenai.find({
        method: 'POST',
        path: /\/runs\/run_completed\/cancel$/,
      }),
      [],
    )
  })

  it('logs stream errors', async (t) => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    const consoleDir = t.mock.method(console, 'dir', () => undefined)
    override = ({ request }) => {
      if (request.method !== 'POST') return undefined
      const match = request.path.match(/^\/threads\/([^/]+)\/runs$/)
      if (!match) return undefined

      return {
        type: 'sse',
        events: [
          {
            event: 'thread.run.created',
            data: fakeRun({ threadId: match[1], status: 'queued' }),
          },
          { data: { error: { message: 'Stream broke' } } },
        ],
      }
    }
    const appHandler = await import('../../../src/app/api/messages/route')

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const controller = new AbortController()
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: assistant.id,
            publicApiKey,
            content: 'Hi',
          }),
          signal: controller.signal,
        })

        assert.strictEqual(response.status, 200)
        const log = await waitForLog({
          workspaceId: workspace.id,
          message: /^Thread Run failed: /,
        })
        controller.abort()

        // The route dumps the stream error, then logs its message.
        assert.strictEqual(consoleDir.mock.callCount(), 1)
        const [dumped, options] = consoleDir.mock.calls[0].arguments
        assert.deepStrictEqual(Object.keys(dumped), ['error'])
        assert.ok(dumped.error instanceof Error)
        assert.match(dumped.error.message, /Stream broke/)
        assert.deepStrictEqual(options, { depth: null })
        assert.strictEqual(
          log.message,
          `Thread Run failed: ${dumped.error.message}`,
        )
      },
    })
  })

  it('cancels the run without logging when the client disconnects', async () => {
    const { assistant, publicApiKey, workspace } = await openaiAssistant()
    let releaseUpstream: () => void = () => undefined
    const upstreamReleased = new Promise<void>((resolve) => {
      releaseUpstream = resolve
    })
    override = ({ request }) => {
      if (request.method !== 'POST') return undefined
      const match = request.path.match(/^\/threads\/([^/]+)\/runs$/)
      if (!match) return undefined
      const run = fakeRun({ threadId: match[1], runId: 'run_disconnect' })

      return {
        type: 'sse',
        events: [
          { event: 'thread.run.created', data: { ...run, status: 'queued' } },
          { event: 'thread.run.in_progress', data: run },
        ],
        waitFor: upstreamReleased,
        finish: 'destroy',
      }
    }
    const appHandler = await import('../../../src/app/api/messages/route')

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const controller = new AbortController()
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: assistant.id,
            publicApiKey,
            content: 'Hi',
          }),
          signal: controller.signal,
        })
        const reader = response.body!.getReader()
        const { value } = await reader.read()
        assert.ok(value && value.length > 0)

        controller.abort()
        await sleep(100)
        releaseUpstream()

        await waitFor({
          check: () =>
            fakeOpenai.find({
              method: 'POST',
              path: /\/runs\/run_disconnect\/cancel$/,
            }).length,
        })
      },
    })

    await sleep(200)
    const logs = await prisma.log.findMany({
      where: { workspaceId: workspace.id },
    })
    assert.deepStrictEqual(logs, [])
  })
})
