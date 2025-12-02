import { testApiHandler } from 'next-test-api-route-handler'
import { ApiKeyType, StorageProviderType } from '@prisma/client'
import assert from 'node:assert'
import { describe, it } from 'node:test'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestApiKey } from '../lib/apiKeys/createTestApiKey'

describe('/api/assistants', () => {
  describe('POST /api/assistants', () => {
    it('stores assistant ID in openaiAssistantId for OPENAI provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const appHandler = await import('../../src/app/api/assistants/route')

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderType: StorageProviderType.OPENAI,
              storageProviderAssistantId: 'asst_openai123',
              modelProviderId: modelProvider.id,
              model: 'gpt-4o-mini',
              name: 'Test OpenAI Assistant',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'asst_openai123',
          )

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: data.assistant.id },
          })
          assert.strictEqual(stored.openaiAssistantId, 'asst_openai123')
          assert.strictEqual(stored.azureAgentsAgentId, null)
        },
      })
    })

    it('stores assistant ID in openaiAssistantId for AZURE_OPENAI provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const appHandler = await import('../../src/app/api/assistants/route')

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderType: StorageProviderType.AZURE_OPENAI,
              storageProviderAssistantId: 'asst_azure456',
              modelProviderId: modelProvider.id,
              model: 'gpt-4o-mini',
              name: 'Test Azure OpenAI Assistant',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'asst_azure456',
          )

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: data.assistant.id },
          })
          assert.strictEqual(stored.openaiAssistantId, 'asst_azure456')
          assert.strictEqual(stored.azureAgentsAgentId, null)
        },
      })
    })

    it('stores assistant ID in azureAgentsAgentId for AZURE_AGENTS provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const appHandler = await import('../../src/app/api/assistants/route')

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderType: StorageProviderType.AZURE_AGENTS,
              storageProviderAssistantId: 'agent_789',
              modelProviderId: modelProvider.id,
              model: 'gpt-4o-mini',
              name: 'Test Azure Agents Assistant',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'agent_789',
          )

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: data.assistant.id },
          })
          assert.strictEqual(stored.azureAgentsAgentId, 'agent_789')
          assert.strictEqual(stored.openaiAssistantId, null)
        },
      })
    })

    it('does not require storageProviderAssistantId for SUPERINTERFACE_CLOUD', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const appHandler = await import('../../src/app/api/assistants/route')

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
              modelProviderId: modelProvider.id,
              model: 'gpt-4o-mini',
              name: 'Test Superinterface Cloud Assistant',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(data.assistant.storageProviderAssistantId, null)

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: data.assistant.id },
          })
          assert.strictEqual(stored.openaiAssistantId, null)
          assert.strictEqual(stored.azureAgentsAgentId, null)
        },
      })
    })
  })

  describe('PATCH /api/assistants/[assistantId]', () => {
    it('updates openaiAssistantId for OPENAI provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const assistant = await prisma.assistant.create({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.OPENAI,
          openaiAssistantId: 'asst_old',
        },
      })

      const appHandler = await import(
        '../../src/app/api/assistants/[assistantId]/route'
      )

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderAssistantId: 'asst_new',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'asst_new',
          )

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: assistant.id },
          })
          assert.strictEqual(stored.openaiAssistantId, 'asst_new')
          assert.strictEqual(stored.azureAgentsAgentId, null)
        },
      })
    })

    it('updates azureAgentsAgentId for AZURE_AGENTS provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const assistant = await prisma.assistant.create({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.AZURE_AGENTS,
          azureAgentsAgentId: 'agent_old',
        },
      })

      const appHandler = await import(
        '../../src/app/api/assistants/[assistantId]/route'
      )

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderAssistantId: 'agent_new',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'agent_new',
          )

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: assistant.id },
          })
          assert.strictEqual(stored.azureAgentsAgentId, 'agent_new')
          assert.strictEqual(stored.openaiAssistantId, null)
        },
      })
    })

    it('switches from OPENAI to AZURE_AGENTS and uses correct field', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const assistant = await prisma.assistant.create({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.OPENAI,
          openaiAssistantId: 'asst_openai',
        },
      })

      const appHandler = await import(
        '../../src/app/api/assistants/[assistantId]/route'
      )

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderType: StorageProviderType.AZURE_AGENTS,
              storageProviderAssistantId: 'agent_new',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(
            data.assistant.storageProviderType,
            StorageProviderType.AZURE_AGENTS,
          )
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'agent_new',
          )

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: assistant.id },
          })
          assert.strictEqual(stored.azureAgentsAgentId, 'agent_new')
          assert.strictEqual(stored.openaiAssistantId, null)
        },
      })
    })

    it('switches from AZURE_AGENTS to OPENAI and uses correct field', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const assistant = await prisma.assistant.create({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.AZURE_AGENTS,
          azureAgentsAgentId: 'agent_azure',
        },
      })

      const appHandler = await import(
        '../../src/app/api/assistants/[assistantId]/route'
      )

      await testApiHandler({
        appHandler,
        params: { assistantId: assistant.id },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'PATCH',
            headers: { Authorization: `Bearer ${privateKey.value}` },
            body: JSON.stringify({
              storageProviderType: StorageProviderType.OPENAI,
              storageProviderAssistantId: 'asst_new',
            }),
          })

          assert.strictEqual(response.status, 200)
          const data = await response.json()
          assert.strictEqual(
            data.assistant.storageProviderType,
            StorageProviderType.OPENAI,
          )
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'asst_new',
          )

          const stored = await prisma.assistant.findUniqueOrThrow({
            where: { id: assistant.id },
          })
          assert.strictEqual(stored.openaiAssistantId, 'asst_new')
          assert.strictEqual(stored.azureAgentsAgentId, null)
        },
      })
    })
  })

  describe('GET /api/assistants/[assistantId]', () => {
    it('returns correct storageProviderAssistantId for AZURE_AGENTS', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const assistant = await prisma.assistant.create({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.AZURE_AGENTS,
          azureAgentsAgentId: 'agent_123',
        },
      })

      const appHandler = await import(
        '../../src/app/api/assistants/[assistantId]/route'
      )

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
          assert.strictEqual(
            data.assistant.storageProviderType,
            StorageProviderType.AZURE_AGENTS,
          )
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'agent_123',
          )
        },
      })
    })

    it('returns correct storageProviderAssistantId for OPENAI', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: { workspaceId: workspace.id },
      })
      const privateKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
      })

      const assistant = await prisma.assistant.create({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4o-mini',
          storageProviderType: StorageProviderType.OPENAI,
          openaiAssistantId: 'asst_456',
        },
      })

      const appHandler = await import(
        '../../src/app/api/assistants/[assistantId]/route'
      )

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
          assert.strictEqual(
            data.assistant.storageProviderType,
            StorageProviderType.OPENAI,
          )
          assert.strictEqual(
            data.assistant.storageProviderAssistantId,
            'asst_456',
          )
        },
      })
    })
  })
})
