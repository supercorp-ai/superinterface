import { testApiHandler } from 'next-test-api-route-handler'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
  ToolType,
} from '@prisma/client'
import assert from 'node:assert'
import { describe, it } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../lib/apiKeys/createTestApiKey'
import { createTestTool } from '../lib/tools/createTestTool'

const createAssistantWithWorkspace = async ({
  modelProviderType = ModelProviderType.OPENAI,
  storageProviderType = StorageProviderType.OPENAI_RESPONSES,
}: {
  modelProviderType?: ModelProviderType
  storageProviderType?: StorageProviderType
} = {}) => {
  const workspace = await createTestWorkspace()
  const modelProvider = await createTestModelProvider({
    data: { workspaceId: workspace.id, type: modelProviderType },
  })
  const assistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: modelProvider.id,
      storageProviderType,
      modelSlug: 'gpt-4o-mini',
    },
  })
  const privateKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
  })
  return { workspace, modelProvider, assistant, privateKey }
}

describe('/api/assistants/[assistantId]/tools', () => {
  describe('POST /api/assistants/[assistantId]/tools', () => {
    it('creates a WEB_SEARCH tool with no settings', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              type: ToolType.WEB_SEARCH,
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tool.type, ToolType.WEB_SEARCH)
          assert.ok(data.tool.id)
          assert.ok(data.tool.webSearchTool)
        },
      })
    })

    it('creates an IMAGE_GENERATION tool with settings', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              type: ToolType.IMAGE_GENERATION,
              imageGenerationTool: {
                model: 'gpt-image-1',
                quality: 'HIGH',
                size: 'SIZE_1024_1024',
                outputFormat: 'PNG',
                background: 'TRANSPARENT',
                partialImages: 2,
              },
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tool.type, ToolType.IMAGE_GENERATION)
          assert.strictEqual(data.tool.imageGenerationTool.model, 'gpt-image-1')
          assert.strictEqual(data.tool.imageGenerationTool.quality, 'HIGH')
          assert.strictEqual(
            data.tool.imageGenerationTool.size,
            'SIZE_1024_1024',
          )
          assert.strictEqual(data.tool.imageGenerationTool.outputFormat, 'PNG')
          assert.strictEqual(
            data.tool.imageGenerationTool.background,
            'TRANSPARENT',
          )
          assert.strictEqual(data.tool.imageGenerationTool.partialImages, 2)

          const stored = await prisma.tool.findUniqueOrThrow({
            where: { id: data.tool.id },
            include: { imageGenerationTool: true },
          })
          assert.strictEqual(stored.imageGenerationTool!.model, 'gpt-image-1')
          assert.strictEqual(stored.imageGenerationTool!.quality, 'HIGH')
        },
      })
    })

    it('creates a COMPUTER_USE tool with settings', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              type: ToolType.COMPUTER_USE,
              computerUseTool: {
                displayWidth: 1920,
                displayHeight: 1080,
                environment: 'BROWSER',
              },
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tool.type, ToolType.COMPUTER_USE)
          assert.strictEqual(data.tool.computerUseTool.displayWidth, 1920)
          assert.strictEqual(data.tool.computerUseTool.displayHeight, 1080)
          assert.strictEqual(data.tool.computerUseTool.environment, 'BROWSER')
        },
      })
    })

    it('creates a FILE_SEARCH tool with vectorStoreIds', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              type: ToolType.FILE_SEARCH,
              fileSearchTool: {
                vectorStoreIds: ['vs_abc123', 'vs_def456'],
                maxNumResults: 10,
              },
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tool.type, ToolType.FILE_SEARCH)
          assert.deepStrictEqual(data.tool.fileSearchTool.vectorStoreIds, [
            'vs_abc123',
            'vs_def456',
          ])
          assert.strictEqual(data.tool.fileSearchTool.maxNumResults, 10)
        },
      })
    })

    it('returns 400 for invalid type', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              type: 'INVALID_TYPE',
            }),
          })

          assert.strictEqual(response.status, 400)
        },
      })
    })

    it('returns 400 when assistant not found', async () => {
      const { privateKey } = await createAssistantWithWorkspace()

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: '00000000-0000-0000-0000-000000000000' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              type: ToolType.WEB_SEARCH,
            }),
          })

          assert.strictEqual(response.status, 400)
        },
      })
    })

    it('returns 400 when tool type is not available for provider config', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace({
        modelProviderType: ModelProviderType.ANTHROPIC,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      })

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              type: ToolType.IMAGE_GENERATION,
            }),
          })

          assert.strictEqual(response.status, 400)
          const data = await response.json()
          assert.ok(data.error.includes('not available'))
        },
      })
    })
  })

  describe('GET /api/assistants/[assistantId]/tools', () => {
    it('lists tools for assistant', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      await createTestTool({
        data: {
          type: ToolType.WEB_SEARCH,
          assistantId: assistant.id,
          webSearchTool: { create: {} },
        },
      })
      await createTestTool({
        data: {
          type: ToolType.CODE_INTERPRETER,
          assistantId: assistant.id,
          codeInterpreterTool: { create: {} },
        },
      })

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tools.length, 2)
        },
      })
    })
  })

  describe('GET /api/assistants/[assistantId]/tools/[toolId]', () => {
    it('gets a single tool', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const tool = await createTestTool({
        data: {
          type: ToolType.IMAGE_GENERATION,
          assistantId: assistant.id,
          imageGenerationTool: {
            create: {
              model: 'gpt-image-1',
              quality: 'HIGH',
              size: 'SIZE_1024_1024',
              outputFormat: 'WEBP',
              background: 'OPAQUE',
              partialImages: 1,
            },
          },
        },
      })

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/[toolId]/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id, toolId: tool.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tool.id, tool.id)
          assert.strictEqual(data.tool.type, ToolType.IMAGE_GENERATION)
          assert.strictEqual(data.tool.imageGenerationTool.model, 'gpt-image-1')
          assert.strictEqual(data.tool.imageGenerationTool.quality, 'HIGH')
          assert.strictEqual(data.tool.imageGenerationTool.outputFormat, 'WEBP')
        },
      })
    })
  })

  describe('PATCH /api/assistants/[assistantId]/tools/[toolId]', () => {
    it('updates IMAGE_GENERATION tool settings', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const tool = await createTestTool({
        data: {
          type: ToolType.IMAGE_GENERATION,
          assistantId: assistant.id,
          imageGenerationTool: {
            create: {
              model: 'gpt-image-1',
              quality: 'LOW',
            },
          },
        },
      })

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/[toolId]/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id, toolId: tool.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              imageGenerationTool: {
                quality: 'HIGH',
                size: 'SIZE_1024_1536',
              },
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tool.imageGenerationTool.quality, 'HIGH')
          assert.strictEqual(
            data.tool.imageGenerationTool.size,
            'SIZE_1024_1536',
          )
        },
      })
    })

    it('updates FILE_SEARCH tool vectorStoreIds', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const tool = await createTestTool({
        data: {
          type: ToolType.FILE_SEARCH,
          assistantId: assistant.id,
          fileSearchTool: {
            create: {
              vectorStoreIds: ['vs_old'],
              maxNumResults: 5,
            },
          },
        },
      })

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/[toolId]/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id, toolId: tool.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              fileSearchTool: {
                vectorStoreIds: ['vs_new1', 'vs_new2'],
                maxNumResults: 15,
              },
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.deepStrictEqual(data.tool.fileSearchTool.vectorStoreIds, [
            'vs_new1',
            'vs_new2',
          ])
          assert.strictEqual(data.tool.fileSearchTool.maxNumResults, 15)
        },
      })
    })
  })

  describe('DELETE /api/assistants/[assistantId]/tools/[toolId]', () => {
    it('deletes a tool', async () => {
      const { assistant, privateKey } = await createAssistantWithWorkspace()

      const tool = await createTestTool({
        data: {
          type: ToolType.WEB_SEARCH,
          assistantId: assistant.id,
          webSearchTool: { create: {} },
        },
      })

      const appHandler =
        await import('../../src/app/api/assistants/[assistantId]/tools/[toolId]/route')

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id, toolId: tool.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'DELETE',
            headers: { Authorization: `Bearer ${privateKey.value}` },
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.tool.id, tool.id)
          assert.strictEqual(data.tool.type, ToolType.WEB_SEARCH)

          const deleted = await prisma.tool.findUnique({
            where: { id: tool.id },
          })
          assert.strictEqual(deleted, null)
        },
      })
    })
  })
})
