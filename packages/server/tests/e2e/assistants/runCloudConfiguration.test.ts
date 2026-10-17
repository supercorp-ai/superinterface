import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  ComputerUseToolEnvironment,
  HandlerType,
  ModelProviderType,
  ReplicateHandlerType,
  StorageProviderType,
  ToolType,
  TransportType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'
import { startFakeLlm } from '../../lib/llm/startFakeLlm'
import { startFakeHttpServer } from '../../lib/http/startFakeHttpServer'
import { redirectGlobalFetch } from '../../lib/http/redirectGlobalFetch'
import { readMessageEvents } from '../../lib/messages/readMessageEvents'

// Runs on Superinterface Cloud storage against a local fake LLM, checking how
// assistant configuration shapes the model requests and function calls.

const postMessage = async ({
  assistantId,
  publicApiKey,
}: {
  assistantId: string
  publicApiKey: string
}) => {
  let status = 0
  let events: Awaited<ReturnType<typeof readMessageEvents>> = []

  await testApiHandler({
    appHandler: await import('../../../src/app/api/messages/route'),
    test: async ({ fetch }) => {
      const response = await fetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, publicApiKey, content: 'Hi' }),
      })
      status = response.status
      events = await readMessageEvents({ response })
    },
  })

  return { status, events }
}

const completedText = ({
  events,
}: {
  events: Awaited<ReturnType<typeof readMessageEvents>>
}) =>
  events
    .filter(({ event }) => event === 'thread.message.completed')
    .map(({ data }) => data.content[0]?.text?.value)

describe('runs on Superinterface Cloud storage', () => {
  it('runs an OpenAI provider assistant through chat completions', async () => {
    const fakeLlm = await startFakeLlm({
      replies: [{ content: 'Hello from OpenAI.' }],
    })
    process.env.OPENAI_BASE_URL = fakeLlm.baseURL

    try {
      const setup = await createTestAssistantSetup({
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        assistantData: { modelSlug: 'gpt-5.4' },
      })

      const { status, events } = await postMessage({
        assistantId: setup.assistant.id,
        publicApiKey: setup.publicKey.value,
      })

      assert.strictEqual(status, 200)
      assert.deepStrictEqual(completedText({ events }), ['Hello from OpenAI.'])
      const [request] = fakeLlm.completionRequests()
      assert.strictEqual(request.body.model, 'gpt-5.4')
      assert.strictEqual(request.body.tools, undefined)
    } finally {
      delete process.env.OPENAI_BASE_URL
      await fakeLlm.close()
    }
  })

  describe('with an Ollama provider', () => {
    let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
    let replicate: Awaited<ReturnType<typeof startFakeHttpServer>>
    let redirect: ReturnType<typeof redirectGlobalFetch>

    before(async () => {
      fakeLlm = await startFakeLlm({
        respond: ({ request }) => {
          const lastMessage = request.body.messages.at(-1)
          if (lastMessage.role === 'tool') {
            return { content: `Tool said ${lastMessage.content}` }
          }
          if (
            request.body.tools?.some(
              ({ function: fn }: { function?: { name: string } }) =>
                fn?.name === 'generate_image',
            )
          ) {
            return {
              toolCalls: [
                {
                  name: 'generate_image',
                  arguments: {
                    input: { prompt: 'a cat', tags: ['user'] },
                  },
                },
              ],
            }
          }
          return { content: 'Plain reply.' }
        },
      })
      replicate = await startFakeHttpServer({
        respond: ({ request }) => {
          if (
            request.method === 'POST' &&
            request.path === '/v1/models/owner/image-model/predictions'
          ) {
            return {
              status: 201,
              json: {
                id: 'pred_1',
                status: 'succeeded',
                input: request.body.input,
                output: ['https://example.com/cat.png'],
                urls: {
                  get: 'https://api.replicate.com/v1/predictions/pred_1',
                },
              },
            }
          }
          return null
        },
      })
      redirect = redirectGlobalFetch({
        from: 'https://api.replicate.com',
        to: replicate.origin,
      })
    })

    after(async () => {
      redirect.restore()
      await Promise.all([fakeLlm.close(), replicate.close()])
    })

    it('sends a computer use tool linked to an MCP server', async () => {
      const setup = await createTestAssistantSetup({
        modelProviderType: ModelProviderType.OLLAMA,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        assistantData: { modelSlug: 'fake-model' },
      })
      await prisma.modelProvider.update({
        where: { id: setup.modelProvider.id },
        data: { endpoint: fakeLlm.baseURL },
      })
      const mcpServer = await prisma.mcpServer.create({
        data: {
          assistantId: setup.assistant.id,
          transportType: TransportType.HTTP,
          httpTransport: {
            create: { url: 'http://127.0.0.1:9/mcp', headers: {} },
          },
        },
      })
      await prisma.tool.create({
        data: {
          assistantId: setup.assistant.id,
          type: ToolType.COMPUTER_USE,
          computerUseTool: {
            create: {
              environment: ComputerUseToolEnvironment.LINUX,
              displayWidth: 1024,
              displayHeight: 768,
              mcpServerId: mcpServer.id,
            },
          },
        },
      })

      const before = fakeLlm.completionRequests().length
      const { status, events } = await postMessage({
        assistantId: setup.assistant.id,
        publicApiKey: setup.publicKey.value,
      })

      assert.strictEqual(status, 200)
      assert.deepStrictEqual(completedText({ events }), ['Plain reply.'])
      const request = fakeLlm.completionRequests()[before]
      const [computerTool] = request.body.tools
      assert.strictEqual(request.body.tools.length, 1)
      assert.strictEqual(computerTool.type, 'function')
      assert.strictEqual(computerTool.function.name, 'computer_call')
      assert.match(computerTool.function.description, /screen is 1024x768/)
    })

    it('merges model arguments over Replicate handler defaults', async () => {
      const setup = await createTestAssistantSetup({
        modelProviderType: ModelProviderType.OLLAMA,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        assistantData: { modelSlug: 'fake-model' },
      })
      await prisma.modelProvider.update({
        where: { id: setup.modelProvider.id },
        data: { endpoint: fakeLlm.baseURL },
      })

      await testApiHandler({
        appHandler: await import(
          '../../../src/app/api/assistants/[assistantId]/functions/route'
        ),
        params: { assistantId: setup.assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: setup.authHeaders,
            body: JSON.stringify({
              openapiSpec: JSON.stringify({
                name: 'generate_image',
                description: 'Generate an image',
                parameters: {
                  type: 'object',
                  properties: { input: { type: 'object' } },
                },
              }),
              handler: {
                type: HandlerType.REPLICATE,
                replicateHandler: {
                  type: ReplicateHandlerType.RUN,
                  identifier: 'owner/image-model',
                  apiKey: 'r8_fake',
                  body: JSON.stringify({
                    input: {
                      prompt: 'default prompt',
                      steps: 4,
                      tags: ['default', 'extra'],
                    },
                  }),
                },
              },
            }),
          })
          assert.strictEqual(response.status, 200)
        },
      })

      const { status, events } = await postMessage({
        assistantId: setup.assistant.id,
        publicApiKey: setup.publicKey.value,
      })

      assert.strictEqual(status, 200)
      const prediction = replicate.requests.find(
        ({ path }) => path === '/v1/models/owner/image-model/predictions',
      )
      assert.ok(prediction)
      assert.strictEqual(prediction.headers.authorization, 'Bearer r8_fake')
      // Objects merge deeply; arrays from the model replace the defaults.
      assert.deepStrictEqual(prediction.body.input, {
        prompt: 'a cat',
        steps: 4,
        tags: ['user'],
      })
      assert.strictEqual(
        completedText({ events }).at(-1),
        'Tool said ["https://example.com/cat.png"]',
      )
    })
  })
})
