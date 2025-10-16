import { testApiHandler } from 'next-test-api-route-handler'
import { ApiKeyType, StorageProviderType, TransportType } from '@prisma/client'
import assert from 'node:assert'
import { describe, it } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../lib/apiKeys/createTestApiKey'
import { tools } from '../../src/lib/tools/tools'

type NativeMcpTool = {
  type: 'mcp'
  mcp: {
    server_label: string
    server_description?: string
    [key: string]: unknown
  }
}

const createAssistantWithWorkspace = async () => {
  const workspace = await createTestWorkspace()
  const modelProvider = await createTestModelProvider({
    data: { workspaceId: workspace.id },
  })
  const assistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: modelProvider.id,
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      modelSlug: 'gpt-4o-mini',
    },
  })
  return { workspace, modelProvider, assistant }
}

describe('/api/assistants/[assistantId]/mcp-servers', () => {
  it('creates MCP server with optional metadata', async () => {
    const { assistant, workspace } = await createAssistantWithWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    const appHandler = await import(
      '../../src/app/api/assistants/[assistantId]/mcp-servers/route'
    )

    await testApiHandler({
      appHandler,
      params: { assistantId: assistant.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'Friendly MCP',
            description: 'Helpful description',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/mcp',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(response.status, 200)
        const data = await response.json()
        assert.strictEqual(data.mcpServer.name, 'Friendly MCP')
        assert.strictEqual(data.mcpServer.description, 'Helpful description')

        const stored = await prisma.mcpServer.findUniqueOrThrow({
          where: { id: data.mcpServer.id },
        })
        assert.strictEqual(stored.name, 'Friendly MCP')
        assert.strictEqual(stored.description, 'Helpful description')
      },
    })
  })

  it('rejects MCP server names with invalid characters', async () => {
    const { assistant, workspace } = await createAssistantWithWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    const appHandler = await import(
      '../../src/app/api/assistants/[assistantId]/mcp-servers/route'
    )

    await testApiHandler({
      appHandler,
      params: { assistantId: assistant.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: '!!!',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/mcp',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(response.status, 400)
      },
    })
  })

  it('rejects MCP server names that normalize to duplicates', async () => {
    const { assistant, workspace } = await createAssistantWithWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    const appHandler = await import(
      '../../src/app/api/assistants/[assistantId]/mcp-servers/route'
    )

    await testApiHandler({
      appHandler,
      params: { assistantId: assistant.id },
      test: async ({ fetch }) => {
        const firstResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'Primary Server',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/one',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(firstResponse.status, 200)

        const duplicateResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'primary-server',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/two',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(duplicateResponse.status, 400)
      },
    })
  })

  it('allows MCP server names with repeated spaces to coexist', async () => {
    const { assistant, workspace } = await createAssistantWithWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    const appHandler = await import(
      '../../src/app/api/assistants/[assistantId]/mcp-servers/route'
    )

    await testApiHandler({
      appHandler,
      params: { assistantId: assistant.id },
      test: async ({ fetch }) => {
        const firstResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'Primary Server',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/one',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(firstResponse.status, 200)

        const spacedResponse = await fetch({
          method: 'POST',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'primary    server',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/two',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(spacedResponse.status, 200)
      },
    })
  })

  it('updates MCP server metadata via PATCH', async () => {
    const { assistant, workspace } = await createAssistantWithWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    const mcpServer = await prisma.mcpServer.create({
      data: {
        name: 'original-name',
        description: 'Original description',
        transportType: TransportType.HTTP,
        assistant: { connect: { id: assistant.id } },
        httpTransport: {
          create: {
            url: 'https://example.com/original',
            headers: { Authorization: 'Bearer original' },
          },
        },
      },
    })

    const appHandler = await import(
      '../../src/app/api/assistants/[assistantId]/mcp-servers/[mcpServerId]/route'
    )

    await testApiHandler({
      appHandler,
      params: { assistantId: assistant.id, mcpServerId: mcpServer.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'PATCH',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'updated-name',
            description: null,
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/updated',
              headers: '{"Authorization":"Bearer updated"}',
            },
          }),
        })

        assert.strictEqual(response.status, 200)
        const data = await response.json()
        assert.strictEqual(data.mcpServer.name, 'updated-name')
        assert.strictEqual(data.mcpServer.description, null)

        const stored = await prisma.mcpServer.findUniqueOrThrow({
          where: { id: mcpServer.id },
          include: { httpTransport: true },
        })
        assert.strictEqual(stored.name, 'updated-name')
        assert.strictEqual(stored.description, null)
        assert.strictEqual(
          stored.httpTransport!.url,
          'https://example.com/updated',
        )
        assert.deepStrictEqual(stored.httpTransport!.headers, {
          Authorization: 'Bearer updated',
        })
      },
    })
  })

  it('prevents MCP server rename collisions on PATCH', async () => {
    const { assistant, workspace } = await createAssistantWithWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    await prisma.mcpServer.create({
      data: {
        name: 'Primary Server',
        transportType: TransportType.HTTP,
        assistant: { connect: { id: assistant.id } },
        httpTransport: {
          create: {
            url: 'https://example.com/one',
            headers: {},
          },
        },
      },
    })

    const conflictingServer = await prisma.mcpServer.create({
      data: {
        name: 'Secondary Server',
        transportType: TransportType.HTTP,
        assistant: { connect: { id: assistant.id } },
        httpTransport: {
          create: {
            url: 'https://example.com/two',
            headers: {},
          },
        },
      },
    })

    const appHandler = await import(
      '../../src/app/api/assistants/[assistantId]/mcp-servers/[mcpServerId]/route'
    )

    await testApiHandler({
      appHandler,
      params: { assistantId: assistant.id, mcpServerId: conflictingServer.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'PATCH',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'primary-server',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/two',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(response.status, 400)
      },
    })
  })

  it('allows MCP server rename when normalization differs', async () => {
    const { assistant, workspace } = await createAssistantWithWorkspace()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    const mcpServer = await prisma.mcpServer.create({
      data: {
        name: 'Primary Server',
        transportType: TransportType.HTTP,
        assistant: { connect: { id: assistant.id } },
        httpTransport: {
          create: {
            url: 'https://example.com/original',
            headers: {},
          },
        },
      },
    })

    const appHandler = await import(
      '../../src/app/api/assistants/[assistantId]/mcp-servers/[mcpServerId]/route'
    )

    await testApiHandler({
      appHandler,
      params: { assistantId: assistant.id, mcpServerId: mcpServer.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'PATCH',
          headers: { Authorization: `Bearer ${privateKey.value}` },
          body: JSON.stringify({
            name: 'primary    server',
            transportType: TransportType.HTTP,
            httpTransport: {
              url: 'https://example.com/original',
              headers: '{}',
            },
          }),
        })

        assert.strictEqual(response.status, 200)
      },
    })
  })

  it('uses metadata when building native MCP tools', async () => {
    const { assistant } = await createAssistantWithWorkspace()

    const thread = await prisma.thread.create({
      data: { assistantId: assistant.id },
    })

    await prisma.mcpServer.create({
      data: {
        name: 'Named Server',
        description: 'Server with description',
        transportType: TransportType.HTTP,
        assistant: { connect: { id: assistant.id } },
        httpTransport: {
          create: {
            url: 'https://example.com/named',
            headers: {},
          },
        },
      },
    })

    const unnamedServer = await prisma.mcpServer.create({
      data: {
        transportType: TransportType.HTTP,
        assistant: { connect: { id: assistant.id } },
        httpTransport: {
          create: {
            url: 'https://example.com/default',
            headers: {},
          },
        },
      },
    })

    const assistantWithIncludes = await prisma.assistant.findUniqueOrThrow({
      where: { id: assistant.id },
      include: {
        tools: {
          include: {
            fileSearchTool: true,
            webSearchTool: true,
            imageGenerationTool: true,
            codeInterpreterTool: true,
            computerUseTool: true,
          },
        },
        functions: true,
        modelProvider: true,
        mcpServers: {
          include: {
            computerUseTool: true,
            stdioTransport: true,
            httpTransport: true,
            sseTransport: true,
          },
        },
      },
    })

    const result = await tools({
      assistant: assistantWithIncludes,
      thread,
      prisma,
    })

    const mcpTools = result.tools.filter(
      (tool): tool is NativeMcpTool => tool.type === 'mcp',
    )

    assert.ok(
      mcpTools.some(
        (tool) =>
          tool.mcp.server_label === 'Named-Server' &&
          tool.mcp.server_description === 'Server with description',
      ),
    )

    const defaultTool = mcpTools.find(
      (tool) => tool.mcp.server_label === `mcp-server-${unnamedServer.id}`,
    )

    assert.ok(defaultTool)
    assert.strictEqual(defaultTool!.mcp.server_description, undefined)
  })
})
