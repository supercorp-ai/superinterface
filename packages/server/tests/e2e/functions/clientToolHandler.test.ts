import assert from 'node:assert'
import { setTimeout as sleep } from 'node:timers/promises'
import { after, before, describe, it } from 'node:test'
import { testApiHandler } from 'next-test-api-route-handler'
import { HandlerType } from '@prisma/client'
import { startFakeLlm, type FakeLlmToolCall } from '../../lib/llm/startFakeLlm'
import { createFakeLlmAssistant } from '../../lib/assistants/createFakeLlmAssistant'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { startFakeUpstashRedis } from '../../lib/redis/startFakeUpstashRedis'
import { streamMessageEvents } from '../../lib/messages/streamMessageEvents'
import type { MessageEvent } from '../../lib/messages/readMessageEvents'
import { assertRunLog } from '../../lib/logs/assertRunLog'
import { waitFor } from '../../lib/async/waitFor'

type Redis = Awaited<ReturnType<typeof startFakeUpstashRedis>>

const submitClientToolOutputs = async ({
  body,
}: {
  body: Record<string, unknown>
}) => {
  const appHandler = await import(
    '../../../src/app/api/threads/runs/submit-client-tool-outputs/route'
  )
  let result: { status: number; json: unknown } = { status: 0, json: null }

  await testApiHandler({
    appHandler,
    test: async ({ fetch }) => {
      const response = await fetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      result = { status: response.status, json: await response.json() }
    },
  })

  return result
}

// Runs a message whose model calls a CLIENT_TOOL function, answering the
// requires_action event through the submit-client-tool-outputs route (unless
// `clientOutput` is undefined, i.e. the client never answers).
const runClientTool = async ({
  toolCall,
  clientOutput,
}: {
  toolCall: FakeLlmToolCall
  clientOutput: unknown
}) => {
  const fakeLlm = await startFakeLlm({
    replies: [{ toolCalls: [toolCall] }, { content: 'All done.' }],
  })

  try {
    const { assistant, publicKey } = await createFakeLlmAssistant({
      baseURL: fakeLlm.baseURL,
    })
    await createTestFunction({
      assistantId: assistant.id,
      openapiSpec: {
        name: 'show_modal',
        parameters: { type: 'object', properties: {} },
      },
      handler: {
        type: HandlerType.CLIENT_TOOL,
        clientToolHandler: {
          create: {
            name: 'openModal',
            arguments: { size: 'large', title: 'Default' },
          },
        },
      },
    })

    const appHandler = await import('../../../src/app/api/messages/route')
    const events: MessageEvent[] = []
    const submissions: Array<{ status: number; json: unknown }> = []

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: assistant.id,
            publicApiKey: publicKey.value,
            content: 'Open the modal.',
          }),
        })

        for await (const event of streamMessageEvents({ response })) {
          events.push(event)

          if (
            clientOutput !== undefined &&
            event.event === 'thread.run.requires_action' &&
            event.data.required_action?.type === 'submit_client_tool_outputs'
          ) {
            const [clientToolCall] =
              event.data.required_action.submit_client_tool_outputs.tool_calls
            submissions.push(
              await submitClientToolOutputs({
                body: {
                  assistantId: assistant.id,
                  publicApiKey: publicKey.value,
                  toolOutputs: [
                    { toolCallId: clientToolCall.id, output: clientOutput },
                  ],
                },
              }),
            )
          }
        }
      },
    })

    const followUp = fakeLlm.completionRequests()[1]
    const toolMessages = (followUp?.body.messages ?? []).filter(
      ({ role }: { role: string }) => role === 'tool',
    )

    return { assistant, events, submissions, toolMessages }
  } finally {
    await fakeLlm.close()
  }
}

describe('CLIENT_TOOL function handler', () => {
  let redis: Redis

  before(async () => {
    redis = await startFakeUpstashRedis()
    process.env.UPSTASH_REDIS_REST_URL = redis.url
    process.env.UPSTASH_REDIS_REST_TOKEN = redis.token
  })

  after(async () => {
    await redis.close()
  })

  it('asks the client to run the tool and returns its output to the model', async (t) => {
    // Shorten the handler's 60s client tool timeout to 5s and record whether
    // it fires; other timers are untouched.
    const realSetTimeout = globalThis.setTimeout
    const clientToolTimeouts: {
      timeout: ReturnType<typeof setTimeout>
      firesAt: number
      fired: boolean
    }[] = []
    t.mock.method(
      globalThis,
      'setTimeout',
      (
        callback: (...args: unknown[]) => void,
        ms?: number,
        ...args: unknown[]
      ) => {
        if (ms !== 60000) return realSetTimeout(callback, ms, ...args)
        const timer = {
          firesAt: Date.now() + 5000,
          fired: false,
          timeout: realSetTimeout(() => {
            timer.fired = true
            callback()
          }, 5000),
        }
        clientToolTimeouts.push(timer)
        return timer.timeout
      },
    )
    const clearTimeoutMock = t.mock.method(globalThis, 'clearTimeout')

    const result = await runClientTool({
      toolCall: { name: 'show_modal', arguments: { title: 'Hello' } },
      clientOutput: 'modal opened',
    })

    const requiresAction = result.events.find(
      ({ event, data }) =>
        event === 'thread.run.requires_action' &&
        data.required_action?.type === 'submit_client_tool_outputs',
    )!
    const [clientToolCall] =
      requiresAction.data.required_action.submit_client_tool_outputs.tool_calls
    assert.strictEqual(clientToolCall.function.name, 'openModal')
    assert.deepStrictEqual(JSON.parse(clientToolCall.function.arguments), {
      size: 'large',
      title: 'Hello',
    })
    assert.deepStrictEqual(result.submissions, [
      { status: 200, json: { status: 'success' } },
    ])
    assert.deepStrictEqual(
      result.toolMessages.map(({ tool_call_id, content }: never) => ({
        tool_call_id,
        content,
      })),
      [{ tool_call_id: clientToolCall.id, content: 'modal opened' }],
    )

    const completed = result.events.findLast(
      ({ event }) => event === 'thread.message.completed',
    )
    assert.strictEqual(completed?.data.content[0].text.value, 'All done.')

    // Pending and output keys are cleaned up once the output is consumed.
    assert.strictEqual(
      redis.store.has(
        `submit-client-tool-outputs:pending:${clientToolCall.id}`,
      ),
      false,
    )
    assert.strictEqual(
      redis.store.has(`submit-client-tool-outputs:output:${clientToolCall.id}`),
      false,
    )

    // The timeout is cleared once the output arrives, so it never fires.
    assert.strictEqual(clientToolTimeouts.length, 1)
    const [clientToolTimeout] = clientToolTimeouts
    assert.ok(
      clearTimeoutMock.mock.calls.some(
        ({ arguments: [timeout] }) => timeout === clientToolTimeout.timeout,
      ),
    )
    await sleep(Math.max(0, clientToolTimeout.firesAt + 200 - Date.now()))
    assert.strictEqual(clientToolTimeout.fired, false)
  })

  it('uses only the handler arguments when the model sends none', async () => {
    const result = await runClientTool({
      toolCall: { name: 'show_modal', arguments: '' },
      clientOutput: 'ok',
    })

    const requiresAction = result.events.find(
      ({ event, data }) =>
        event === 'thread.run.requires_action' &&
        data.required_action?.type === 'submit_client_tool_outputs',
    )!
    const [clientToolCall] =
      requiresAction.data.required_action.submit_client_tool_outputs.tool_calls
    assert.deepStrictEqual(JSON.parse(clientToolCall.function.arguments), {
      size: 'large',
      title: 'Default',
    })
    assert.strictEqual(result.toolMessages[0].content, 'ok')
  })

  it('marks the client tool call as pending for a week', async () => {
    const result = await runClientTool({
      toolCall: { name: 'show_modal', arguments: { title: 'Hi' } },
      clientOutput: 'ok',
    })

    const toolCallId = result.toolMessages[0].tool_call_id
    const pendingKey = `submit-client-tool-outputs:pending:${toolCallId}`
    const pendingSets = redis.commands.filter(
      ([name, key]) => name.toLowerCase() === 'set' && key === pendingKey,
    )
    assert.deepStrictEqual(pendingSets, [
      ['set', pendingKey, '1', 'ex', 604800],
    ])
  })

  it('times out when the client never submits an output', async (t) => {
    // Fire the 60s client tool timeout right away; other timers are untouched.
    const realSetTimeout = globalThis.setTimeout
    t.mock.method(
      globalThis,
      'setTimeout',
      (
        callback: (...args: unknown[]) => void,
        ms?: number,
        ...args: unknown[]
      ) => realSetTimeout(callback, ms === 60000 ? 0 : ms, ...args),
    )

    const result = await runClientTool({
      toolCall: { name: 'show_modal', arguments: { title: 'Hi' } },
      clientOutput: undefined,
    })

    assert.strictEqual(result.submissions.length, 0)
    assert.strictEqual(
      result.toolMessages[0].content,
      'Function call timed out',
    )

    // The handler keeps polling for an output after timing out; answering
    // it lets that loop finish and clean up.
    const toolCallId = result.toolMessages[0].tool_call_id
    redis.store.set(`submit-client-tool-outputs:output:${toolCallId}`, 'late')
    await waitFor({
      check: () =>
        !redis.store.has(`submit-client-tool-outputs:pending:${toolCallId}`) &&
        !redis.store.has(`submit-client-tool-outputs:output:${toolCallId}`),
    })
  })

  it('rejects invalid JSON arguments without asking the client', async () => {
    const result = await runClientTool({
      toolCall: { name: 'show_modal', arguments: '{broken' },
      clientOutput: 'unused',
    })

    assert.strictEqual(
      result.events.some(
        ({ event, data }) =>
          event === 'thread.run.requires_action' &&
          data.required_action?.type === 'submit_client_tool_outputs',
      ),
      false,
    )
    assert.strictEqual(result.submissions.length, 0)
    assert.strictEqual(result.toolMessages[0].content, 'Invalid arguments.')
    await assertRunLog({
      assistant: result.assistant,
      status: 400,
      message:
        "Failed parsing client tool function arguments: Expected property name or '}' in JSON at position 1 (line 1 column 2)",
    })
  })
})
