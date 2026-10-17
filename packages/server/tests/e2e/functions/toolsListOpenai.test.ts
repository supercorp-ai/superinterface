import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  ApiKeyType,
  ImageGenerationToolSize,
  ModelProviderType,
  StorageProviderType,
  ToolType,
  TransportType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestNativeTool } from '../../lib/tools/createTestNativeTool'
import { createTestComputerUseTool } from '../../lib/tools/createTestComputerUseTool'
import { createTestMcpServer } from '../../lib/mcpServers/createTestMcpServer'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { startFakeMcpServer } from '../../lib/mcpServers/startFakeMcpServer'
import { startTestHttpServer } from '../../lib/http/startTestHttpServer'
import { postMessage } from '../../lib/messages/postMessage'

const json = (body: unknown) => ({ status: 200, body })

const createOpenaiAssistant = async ({
  storageProviderType,
  modelSlug = 'gpt-4o-mini',
}: {
  storageProviderType: StorageProviderType
  modelSlug?: string
}) => {
  const workspace = await createTestWorkspace()
  const modelProvider = await createTestModelProvider({
    data: { workspaceId: workspace.id, type: ModelProviderType.OPENAI },
  })
  const assistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: modelProvider.id,
      storageProviderType,
      modelSlug,
      openaiAssistantId: 'asst_fake',
    },
  })
  const publicKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
  })

  return { assistant, publicKey }
}

const addImageGenerationTools = async ({
  assistantId,
}: {
  assistantId: string
}) => {
  for (const size of [
    ImageGenerationToolSize.AUTO,
    ImageGenerationToolSize.SIZE_1024_1024,
    ImageGenerationToolSize.SIZE_1024_1536,
    ImageGenerationToolSize.SIZE_1536_1024,
  ]) {
    await createTestNativeTool({
      assistantId,
      type: ToolType.IMAGE_GENERATION,
      config: { size },
    })
  }
}

const addComputer = async ({
  assistantId,
  url,
}: {
  assistantId: string
  url: string
}) => {
  const computerMcpServer = await createTestMcpServer({
    assistantId,
    transportType: TransportType.HTTP,
    url,
    name: 'computer',
  })
  await createTestComputerUseTool({
    assistantId,
    mcpServerId: computerMcpServer.id,
  })
}

describe('tools sent to OpenAI', () => {
  // Stands in for api.openai.com (the OpenAI SDK honors OPENAI_BASE_URL).
  let openai: Awaited<ReturnType<typeof startTestHttpServer>>

  before(async () => {
    openai = await startTestHttpServer({
      handle: ({ request, res }) => {
        const route = `${request.method} ${request.path}`
        const reply = {
          'POST /v1/conversations': json({
            id: 'conv_test',
            object: 'conversation',
            created_at: 0,
            metadata: {},
          }),
          'POST /v1/threads': json({
            id: 'thread_test',
            object: 'thread',
            created_at: 0,
            metadata: {},
          }),
          'POST /v1/threads/thread_test/messages': json({
            id: 'msg_test',
            object: 'thread.message',
            thread_id: 'thread_test',
            role: 'user',
            content: [],
            created_at: 0,
            metadata: {},
          }),
        }[route] ?? { status: 400, body: { error: { message: 'fake' } } }

        res.writeHead(reply.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(reply.body))
      },
    })
    process.env.OPENAI_BASE_URL = `${openai.url}/v1`
  })

  after(async () => {
    await openai.close()
  })

  const requestBody = ({ path }: { path: string }) =>
    JSON.parse(openai.requests.findLast((r) => r.path === path)!.rawBody)

  it('sends native and MCP tools to the Responses API', async () => {
    const { assistant, publicKey } = await createOpenaiAssistant({
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
    })
    await createTestFunction({
      assistantId: assistant.id,
      openapiSpec: { name: 'lookup', description: 'Looks up', parameters: {} },
    })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.FILE_SEARCH,
      config: { vectorStoreIds: ['vs_1'], maxNumResults: 5 },
    })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.FILE_SEARCH,
      config: { vectorStoreIds: [] },
    })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.CODE_INTERPRETER,
    })
    await addImageGenerationTools({ assistantId: assistant.id })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.WEB_SEARCH,
    })
    await addComputer({
      assistantId: assistant.id,
      url: 'http://127.0.0.1:1/computer',
    })
    await createTestComputerUseTool({
      assistantId: assistant.id,
      mcpServerId: null,
    })
    await createTestMcpServer({
      assistantId: assistant.id,
      transportType: TransportType.HTTP,
      url: 'https://mcp.example.test/{{tenant}}/mcp',
      headers: { Authorization: 'Bearer {{token}}' },
      name: 'Docs Server',
      description: 'Searches docs',
    })
    const unnamed = await createTestMcpServer({
      assistantId: assistant.id,
      transportType: TransportType.SSE,
      url: 'https://sse.example.test/sse',
    })
    const stdio = await prisma.mcpServer.create({
      data: { assistantId: assistant.id, transportType: TransportType.STDIO },
    })

    const result = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'hi',
        tenant: 'acme',
        token: 'secret',
      },
    })

    assert.strictEqual(result.status, 200)
    assert.ok(result.events.some(({ event }) => event === 'thread.run.failed'))

    const body = requestBody({ path: '/v1/responses' })
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
    })
    const metadataHeaders = {
      tenant: 'acme',
      token: 'secret',
      'thread-id': thread.id,
      'assistant-id': assistant.id,
    }
    const byType = (type: string) =>
      body.tools.filter((tool: { type: string }) => tool.type === type)

    // The file search without vector stores and the computer without an MCP
    // server are not sent at all.
    assert.deepStrictEqual(
      body.tools.map((tool: { type: string } | null) => tool?.type),
      [
        'mcp',
        'mcp',
        'mcp',
        'function',
        'code_interpreter',
        'image_generation',
        'image_generation',
        'image_generation',
        'image_generation',
        'web_search',
        'computer_use_preview',
      ],
    )

    assert.deepStrictEqual(byType('mcp'), [
      {
        type: 'mcp',
        server_label: 'Docs-Server',
        server_description: 'Searches docs',
        server_url: 'https://mcp.example.test/acme/mcp',
        headers: { authorization: 'Bearer secret', ...metadataHeaders },
        require_approval: 'never',
      },
      {
        type: 'mcp',
        server_label: `mcp-server-${unnamed.id}`,
        server_url: 'https://sse.example.test/sse',
        headers: metadataHeaders,
        require_approval: 'never',
      },
      {
        type: 'mcp',
        server_label: `mcp-server-${stdio.id}`,
        server_url: '',
        headers: metadataHeaders,
        require_approval: 'never',
      },
    ])
    assert.deepStrictEqual(byType('function'), [
      {
        type: 'function',
        name: 'lookup',
        description: 'Looks up',
        parameters: {},
      },
    ])
    assert.deepStrictEqual(byType('code_interpreter'), [
      { type: 'code_interpreter', container: { type: 'auto' } },
    ])
    assert.deepStrictEqual(
      byType('image_generation').map(({ size }: { size: string }) => size),
      ['auto', '1024x1024', '1024x1536', '1536x1024'],
    )
    assert.deepStrictEqual(byType('image_generation')[0], {
      type: 'image_generation',
      model: 'gpt-image-1',
      background: 'auto',
      quality: 'auto',
      output_format: 'png',
      size: 'auto',
      partial_images: 0,
    })
    assert.deepStrictEqual(byType('web_search'), [{ type: 'web_search' }])
    assert.deepStrictEqual(byType('computer_use_preview'), [
      {
        type: 'computer_use_preview',
        environment: 'linux',
        display_width: 1024,
        display_height: 768,
      },
    ])
  })

  it('lists MCP tools as functions for OpenAI computer use models', async () => {
    const mcp = await startFakeMcpServer({
      tools: [
        {
          name: 'search_docs',
          description: 'Search',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    })

    try {
      const { assistant, publicKey } = await createOpenaiAssistant({
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        modelSlug: 'gpt-5.4',
      })
      await createTestMcpServer({
        assistantId: assistant.id,
        transportType: TransportType.HTTP,
        url: mcp.httpUrl,
      })
      await addComputer({
        assistantId: assistant.id,
        url: 'http://127.0.0.1:1/computer',
      })

      const result = await postMessage({
        body: {
          assistantId: assistant.id,
          publicApiKey: publicKey.value,
          content: 'hi',
        },
      })

      assert.strictEqual(result.status, 200)
      const body = requestBody({ path: '/v1/responses' })
      assert.deepStrictEqual(body.tools, [
        {
          type: 'function',
          name: 'search_docs',
          description: 'Search',
          parameters: { type: 'object', properties: {} },
        },
        { type: 'computer' },
      ])
    } finally {
      await mcp.close()
    }
  })

  it('sends Assistants API native tools for OpenAI storage', async () => {
    const { assistant, publicKey } = await createOpenaiAssistant({
      storageProviderType: StorageProviderType.OPENAI,
    })
    await createTestFunction({
      assistantId: assistant.id,
      openapiSpec: { name: 'lookup', parameters: {} },
    })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.FILE_SEARCH,
    })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.CODE_INTERPRETER,
    })
    await addImageGenerationTools({ assistantId: assistant.id })
    await createTestNativeTool({
      assistantId: assistant.id,
      type: ToolType.WEB_SEARCH,
    })
    await addComputer({
      assistantId: assistant.id,
      url: 'http://127.0.0.1:1/computer',
    })

    const result = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'hi',
      },
    })

    // The fake API rejects the run, so the route reports the failure.
    assert.strictEqual(result.status, 500)
    const body = requestBody({ path: '/v1/threads/thread_test/runs' })
    assert.strictEqual(body.assistant_id, 'asst_fake')
    // Image generation, web search and computer use have no Assistants API
    // equivalent and are dropped.
    assert.deepStrictEqual(body.tools, [
      { type: 'function', function: { name: 'lookup', parameters: {} } },
      { type: 'file_search' },
      { type: 'code_interpreter' },
    ])
  })
})
