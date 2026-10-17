import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import type { ServerResponse } from 'node:http'
import {
  HandlerType,
  MethodType,
  ModelProviderType,
  Prisma,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'
import { createFakeLlmAssistant } from '../../lib/assistants/createFakeLlmAssistant'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { runFakeToolCalls } from '../../lib/functions/runFakeToolCalls'
import {
  startTestHttpServer,
  type TestHttpRequest,
} from '../../lib/http/startTestHttpServer'
import { assertAssistantLog } from '../../lib/logs/assertAssistantLog'

type OpenaiRoute = (args: { request: TestHttpRequest }) => {
  status: number
  body: unknown
}

const sendJson = ({
  res,
  status,
  body,
}: {
  res: ServerResponse
  status: number
  body: unknown
}) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

const askChildFunction = async ({
  parentAssistantId,
  childAssistantId,
}: {
  parentAssistantId: string
  childAssistantId: string
}) =>
  createTestFunction({
    assistantId: parentAssistantId,
    openapiSpec: {
      name: 'ask_child',
      parameters: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
    },
    handler: {
      type: HandlerType.ASSISTANT,
      assistantHandler: { create: { assistantId: childAssistantId } },
    },
  })

describe('ASSISTANT function handler', () => {
  // Stands in for api.openai.com for children that use OpenAI storage.
  let openai: Awaited<ReturnType<typeof startTestHttpServer>>
  let openaiRoute: OpenaiRoute = () => ({ status: 400, body: {} })

  before(async () => {
    openai = await startTestHttpServer({
      handle: ({ request, res }) => {
        const { status, body } = openaiRoute({ request })
        sendJson({ res, status, body })
      },
    })
    process.env.OPENAI_BASE_URL = `${openai.url}/v1`
  })

  after(async () => {
    await openai.close()
  })

  const runWithOpenaiChild = async ({
    storageProviderType,
    route,
  }: {
    storageProviderType: StorageProviderType
    route: OpenaiRoute
  }) => {
    openaiRoute = route
    const firstRequest = openai.requests.length
    let childAssistantId = ''

    const result = await runFakeToolCalls({
      toolCalls: [{ name: 'ask_child', arguments: { message: 'Hi child' } }],
      setup: async ({ assistant }) => {
        const modelProvider = await createTestModelProvider({
          data: {
            workspaceId: assistant.workspaceId,
            type: ModelProviderType.OPENAI,
            apiKey: 'sk-test',
          },
        })
        const child = await createTestAssistant({
          data: {
            workspaceId: assistant.workspaceId,
            modelProviderId: modelProvider.id,
            storageProviderType,
            openaiAssistantId: 'asst_fake',
            modelSlug: 'gpt-4o-mini',
          },
        })
        childAssistantId = child.id
        await askChildFunction({
          parentAssistantId: assistant.id,
          childAssistantId: child.id,
        })
      },
    })

    return {
      ...result,
      childAssistantId,
      openaiRequests: openai.requests.slice(firstRequest),
    }
  }

  // The child's failures are logged against the child and its new thread.
  const assertChildLog = async ({
    result,
    message,
  }: {
    result: Awaited<ReturnType<typeof runWithOpenaiChild>>
    message: string
  }) => {
    const childThread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: result.childAssistantId },
    })
    await assertAssistantLog({
      assistantId: result.childAssistantId,
      workspaceId: result.assistant.workspaceId,
      threadId: childThread.id,
      status: 500,
      message,
    })
  }

  it('runs the child assistant and returns its messages as the tool output', async () => {
    const childLlm = await startFakeLlm({
      replies: [
        {
          toolCalls: [{ name: 'child_lookup', arguments: { q: 'Hi child' } }],
        },
        { content: 'Child says hi.' },
      ],
    })
    const api = await startTestHttpServer({
      handle: ({ res }) => sendJson({ res, status: 200, body: { found: 42 } }),
    })

    try {
      let childAssistantId = ''
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'ask_child', arguments: { message: 'Hi child' } }],
        body: { locale: 'lt' },
        setup: async ({ assistant }) => {
          const { assistant: child } = await createFakeLlmAssistant({
            baseURL: childLlm.baseURL,
            workspaceId: assistant.workspaceId,
          })
          childAssistantId = child.id
          await createTestFunction({
            assistantId: child.id,
            openapiSpec: { name: 'child_lookup', parameters: {} },
            handler: {
              type: HandlerType.REQUEST,
              requestHandler: {
                create: {
                  url: api.url,
                  method: MethodType.GET,
                  headers: {},
                  body: {},
                },
              },
            },
          })
          await askChildFunction({
            parentAssistantId: assistant.id,
            childAssistantId: child.id,
          })
        },
      })

      assert.strictEqual(result.status, 200)
      // Every completed child message is joined, including the empty one that
      // only carried the child's tool call.
      assert.deepStrictEqual(result.toolOutputs, ['\n\nChild says hi.'])

      // The child model got the message and its own tool output.
      const childRequests = childLlm.completionRequests()
      assert.strictEqual(childRequests.length, 2)
      const childUser = childRequests[0].body.messages.find(
        ({ role }: { role: string }) => role === 'user',
      )
      assert.strictEqual(childUser.content, 'Hi child')
      const childTool = childRequests[1].body.messages.find(
        ({ role }: { role: string }) => role === 'tool',
      )
      assert.strictEqual(childTool.content, JSON.stringify({ found: 42 }))
      assert.strictEqual(api.requests[0].query.get('q'), 'Hi child')

      // Child text deltas are streamed to the parent as tool call output.
      const parentToolCallId = result.toolMessages[0].tool_call_id
      const outputDeltas = result.events
        .filter(({ event }) => event === 'thread.run.step.delta')
        .flatMap(({ data }) => data.delta.step_details.tool_calls)
        .filter(({ id }: { id: string }) => id === parentToolCallId)
      assert.ok(outputDeltas.length > 0)
      assert.strictEqual(
        outputDeltas.map(({ function: fn }) => fn.output).join(''),
        'Child says hi.',
      )
      assert.strictEqual(outputDeltas[0].index, 0)

      // A child thread is created with the parent's variables.
      const childThread = await prisma.thread.findFirstOrThrow({
        where: { assistantId: childAssistantId },
      })
      const metadata = childThread.metadata as Record<string, string>
      assert.strictEqual(metadata.locale, 'lt')
      assert.strictEqual(metadata.assistantId, childAssistantId)
    } finally {
      await childLlm.close()
      await api.close()
    }
  })

  it('starts the child thread without variables when the parent has no metadata', async () => {
    const childLlm = await startFakeLlm({ replies: [{ content: 'Bare.' }] })

    try {
      let childAssistantId = ''
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'ask_child', arguments: { message: 'Hi' } }],
        setup: async ({ assistant }) => {
          const { assistant: child } = await createFakeLlmAssistant({
            baseURL: childLlm.baseURL,
            workspaceId: assistant.workspaceId,
          })
          childAssistantId = child.id
          await askChildFunction({
            parentAssistantId: assistant.id,
            childAssistantId: child.id,
          })
          const thread = await prisma.thread.create({
            data: { assistantId: assistant.id, metadata: Prisma.DbNull },
          })
          return { threadId: thread.id }
        },
      })

      assert.deepStrictEqual(result.toolOutputs, ['Bare.'])
      const childThread = await prisma.thread.findFirstOrThrow({
        where: { assistantId: childAssistantId },
      })
      const metadata = childThread.metadata as Record<string, string>
      assert.strictEqual(metadata.assistantId, childAssistantId)
      assert.strictEqual(metadata.threadId, childThread.id)
    } finally {
      await childLlm.close()
    }
  })

  it('rejects invalid JSON arguments', async () => {
    const result = await runFakeToolCalls({
      toolCalls: [{ name: 'ask_child', arguments: '{oops' }],
      setup: async ({ assistant }) => {
        await askChildFunction({
          parentAssistantId: assistant.id,
          childAssistantId: assistant.id,
        })
      },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Invalid arguments.'])
    const parentThread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: result.assistant.id },
    })
    await assertAssistantLog({
      assistantId: result.assistant.id,
      workspaceId: result.assistant.workspaceId,
      threadId: parentThread.id,
      status: 500,
      message:
        "Failed parsing Assistant function arguments: Expected property name or '}' in JSON at position 1 (line 1 column 2)",
    })
  })

  it('reports a missing child assistant', async () => {
    const result = await runFakeToolCalls({
      toolCalls: [{ name: 'ask_child', arguments: { message: 'Hi' } }],
      setup: async ({ assistant }) => {
        const fn = await createTestFunction({
          assistantId: assistant.id,
          openapiSpec: { name: 'ask_child', parameters: {} },
          handler: { type: HandlerType.ASSISTANT },
        })
        const handler = await prisma.handler.findUniqueOrThrow({
          where: { functionId: fn.id },
        })
        // The FK forbids dangling references, so bypass it for this row.
        await prisma.$transaction([
          prisma.$executeRaw`SET LOCAL session_replication_role = replica`,
          prisma.$executeRaw`INSERT INTO "AssistantHandler" (id, "assistantId", "handlerId", "updatedAt") VALUES (${randomUUID()}::uuid, ${randomUUID()}::uuid, ${handler.id}::uuid, now())`,
        ])
      },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Assistant not found.'])
    const parentThread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: result.assistant.id },
    })
    await assertAssistantLog({
      assistantId: result.assistant.id,
      workspaceId: result.assistant.workspaceId,
      threadId: parentThread.id,
      status: 500,
      message: 'Assistant not found when handling Assistant function.',
    })
  })

  it('reports a failure to create the child message', async () => {
    const result = await runWithOpenaiChild({
      storageProviderType: StorageProviderType.OPENAI,
      route: ({ request }) => {
        if (request.method === 'POST' && request.path === '/v1/threads') {
          return {
            status: 200,
            body: {
              id: 'thread_child',
              object: 'thread',
              created_at: 0,
              metadata: {},
            },
          }
        }
        return { status: 400, body: { error: { message: 'bad message' } } }
      },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Failed creating message.'])
    await assertChildLog({ result, message: 'Failed creating message.' })
    assert.ok(
      result.openaiRequests.some(
        ({ path }) => path === '/v1/threads/thread_child/messages',
      ),
    )
  })

  it('reports a failure to create the child thread', async () => {
    const result = await runWithOpenaiChild({
      storageProviderType: StorageProviderType.OPENAI,
      route: () => ({ status: 400, body: { error: { message: 'down' } } }),
    })

    assert.deepStrictEqual(result.toolOutputs, ['Failed creating thread.'])
    // The child thread could not be created, so the log has no thread.
    await assertAssistantLog({
      assistantId: result.childAssistantId,
      workspaceId: result.assistant.workspaceId,
      threadId: null,
      status: 500,
      message: 'Failed creating thread inside Assistant function.',
    })
    assert.ok(
      result.openaiRequests.some(
        ({ method, path }) => method === 'POST' && path === '/v1/threads',
      ),
    )
  })

  it('creates a managed OpenAI thread when the storage thread id is missing', async () => {
    let threadCreates = 0
    const result = await runWithOpenaiChild({
      storageProviderType: StorageProviderType.OPENAI,
      route: ({ request }) => {
        if (request.method === 'POST' && request.path === '/v1/threads') {
          threadCreates += 1
          if (threadCreates === 1) {
            return { status: 200, body: { id: null, object: 'thread' } }
          }
          return { status: 400, body: { error: { message: 'no more' } } }
        }
        return { status: 400, body: { error: { message: 'unexpected' } } }
      },
    })

    assert.deepStrictEqual(result.toolOutputs, [
      'Failed getting managed OpenAI thread ID.',
    ])
    assert.strictEqual(threadCreates, 2)
    await assertChildLog({
      result,
      message: 'Failed getting managed OpenAI thread ID.',
    })
  })

  it('reports a failure to create the child run', async () => {
    let threadCreates = 0
    const result = await runWithOpenaiChild({
      storageProviderType: StorageProviderType.OPENAI,
      route: ({ request }) => {
        if (request.method === 'POST' && request.path === '/v1/threads') {
          threadCreates += 1
          return {
            status: 200,
            body: {
              id: threadCreates === 1 ? null : 'thread_managed',
              object: 'thread',
              created_at: 0,
              metadata: {},
            },
          }
        }
        if (request.path === '/v1/threads/thread_managed/messages') {
          return {
            status: 200,
            body: {
              id: 'msg_1',
              object: 'thread.message',
              thread_id: 'thread_managed',
              role: 'user',
              content: [],
              created_at: 0,
              metadata: {},
            },
          }
        }
        return { status: 400, body: { error: { message: 'run failed' } } }
      },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Failed creating run stream.'])
    await assertChildLog({
      result,
      message: 'Failed creating run stream: 400 run failed',
    })
    assert.ok(
      result.openaiRequests.some(
        ({ path }) => path === '/v1/threads/thread_managed/runs',
      ),
    )
  })

  it('reports an invalid thread configuration for responses storage', async () => {
    const result = await runWithOpenaiChild({
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      route: ({ request }) => {
        if (request.method === 'POST' && request.path === '/v1/conversations') {
          return {
            status: 200,
            body: { id: null, object: 'conversation', created_at: 0 },
          }
        }
        return { status: 400, body: { error: { message: 'unexpected' } } }
      },
    })

    assert.deepStrictEqual(result.toolOutputs, ['Invalid thread configuration'])
    await assertChildLog({ result, message: 'Invalid thread configuration' })
  })
})
