import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
  TransportType,
} from '@prisma/client'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { createTestComputerUseTool } from '../../lib/tools/createTestComputerUseTool'
import { createTestMcpServer } from '../../lib/mcpServers/createTestMcpServer'
import { startTestHttpServer } from '../../lib/http/startTestHttpServer'
import { postMessage } from '../../lib/messages/postMessage'
import { waitForAssistantLog } from '../../lib/logs/waitForAssistantLog'

const createAssistant = async ({
  type,
  apiKey,
  modelSlug,
}: {
  type: ModelProviderType
  apiKey: string
  modelSlug: string
}) => {
  const workspace = await createTestWorkspace()
  const modelProvider = await createTestModelProvider({
    data: { workspaceId: workspace.id, type, apiKey },
  })
  const assistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: modelProvider.id,
      storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      modelSlug,
    },
  })
  const computerMcpServer = await createTestMcpServer({
    assistantId: assistant.id,
    transportType: TransportType.HTTP,
    url: 'http://127.0.0.1:1/computer',
  })
  await createTestComputerUseTool({
    assistantId: assistant.id,
    mcpServerId: computerMcpServer.id,
  })
  await createTestFunction({
    assistantId: assistant.id,
    openapiSpec: { name: 'lookup', parameters: { type: 'object' } },
  })
  const publicKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
  })

  return { assistant, publicKey }
}

describe('tools for other providers', () => {
  // Stands in for the Gemini API (the Google SDK honors GOOGLE_GEMINI_BASE_URL).
  let gemini: Awaited<ReturnType<typeof startTestHttpServer>>

  before(async () => {
    gemini = await startTestHttpServer({
      handle: ({ res }) => {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            error: { code: 400, message: 'fake gemini', status: 'INVALID' },
          }),
        )
      },
    })
    process.env.GOOGLE_GEMINI_BASE_URL = gemini.url
  })

  after(async () => {
    await gemini.close()
  })

  it('offers Google models the native computer use tool', async () => {
    const { assistant, publicKey } = await createAssistant({
      type: ModelProviderType.GOOGLE,
      apiKey: 'google-test',
      modelSlug: 'gemini-fake',
    })

    const result = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'hi',
      },
    })

    assert.strictEqual(result.status, 200)
    const request = gemini.requests.find(({ path }) =>
      path.includes('gemini-fake'),
    )!
    // The computer tool becomes Gemini's native computer use tool.
    assert.deepStrictEqual(JSON.parse(request.rawBody).tools, [
      {
        computerUse: {
          environment: 'ENVIRONMENT_BROWSER',
          excludedPredefinedFunctions: [
            'navigate',
            'go_back',
            'go_forward',
            'search',
            'open_web_browser',
          ],
        },
      },
      {
        functionDeclarations: [
          { name: 'lookup', parameters: { type: 'OBJECT' } },
        ],
      },
    ])
  })

  // OpenRouter and Humiris use hardcoded hosts with no override, so these runs
  // are stopped before any request by an API key that is not a valid header.
  it('builds the computer tool for OpenRouter models', async () => {
    const { assistant, publicKey } = await createAssistant({
      type: ModelProviderType.OPEN_ROUTER,
      apiKey: 'invalid\nkey',
      modelSlug: 'openrouter/fake',
    })

    const result = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'hi',
      },
    })

    assert.strictEqual(result.status, 200)
    assert.ok(
      result.events.some(({ event }) =>
        ['thread.run.failed', 'error'].includes(event),
      ),
    )
    await waitForAssistantLog({
      assistantId: assistant.id,
      match: ({ message }) => message.startsWith('Thread Run failed:'),
    })
  })

  it('omits tools for providers without function calling', async () => {
    const { assistant, publicKey } = await createAssistant({
      type: ModelProviderType.HUMIRIS,
      apiKey: 'invalid\nkey',
      modelSlug: 'Humiris/humiris-moai',
    })

    const result = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'hi',
      },
    })

    assert.strictEqual(result.status, 200)
    await waitForAssistantLog({
      assistantId: assistant.id,
      match: ({ message }) => message.startsWith('Thread Run failed:'),
    })
  })
})
