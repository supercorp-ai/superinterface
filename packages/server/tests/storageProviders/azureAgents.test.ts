import assert from 'node:assert'
import { describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import { ModelProviderType, StorageProviderType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'
import { azureAgentsStorageProviderTypes } from '@/lib/storageProviders/azureAgentsStorageProviderTypes'
import { clientAdapter } from '@/lib/modelProviders/clientAdapter'
import { buildAzureAiProjectClient } from '@/lib/modelProviders/buildAzureAiProjectClient'
import { getAzureAiProjectClient } from '@/lib/modelProviders/getAzureAiProjectClient'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'
import { storageThreadId } from '@/lib/threads/storageThreadId'

describe('Azure Agents Storage Provider', () => {
  describe('isAzureAgentsStorageProvider', () => {
    it('returns true for AZURE_AGENTS storage provider type', () => {
      const result = isAzureAgentsStorageProvider({
        storageProviderType: StorageProviderType.AZURE_AGENTS,
      })
      assert.strictEqual(result, true)
    })

    it('returns false for non-Azure Agents storage provider types', () => {
      const types = [
        StorageProviderType.OPENAI,
        StorageProviderType.AZURE_OPENAI,
        StorageProviderType.SUPERINTERFACE_CLOUD,
        StorageProviderType.OPENAI_RESPONSES,
        StorageProviderType.AZURE_OPENAI_RESPONSES,
      ]

      for (const type of types) {
        const result = isAzureAgentsStorageProvider({
          storageProviderType: type,
        })
        assert.strictEqual(result, false, `Expected ${type} to return false`)
      }
    })
  })

  describe('azureAgentsStorageProviderTypes', () => {
    it('includes AZURE_AGENTS type', () => {
      assert.ok(
        azureAgentsStorageProviderTypes.includes(
          StorageProviderType.AZURE_AGENTS,
        ),
      )
    })

    it('only includes AZURE_AGENTS type', () => {
      assert.strictEqual(azureAgentsStorageProviderTypes.length, 1)
      assert.strictEqual(
        azureAgentsStorageProviderTypes[0],
        StorageProviderType.AZURE_AGENTS,
      )
    })
  })

  describe('buildAzureAiProjectClient', () => {
    it('throws error when azureTenantId is missing', () => {
      const modelProvider = {
        id: randomUUID(),
        azureTenantId: null,
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: 'https://test.cognitiveservices.azure.com/',
      } as any

      assert.throws(
        () => buildAzureAiProjectClient({ modelProvider }),
        /Azure AI Project credentials missing/,
      )
    })

    it('throws error when azureClientId is missing', () => {
      const modelProvider = {
        id: randomUUID(),
        azureTenantId: 'tenant-id',
        azureClientId: null,
        azureClientSecret: 'client-secret',
        endpoint: 'https://test.cognitiveservices.azure.com/',
      } as any

      assert.throws(
        () => buildAzureAiProjectClient({ modelProvider }),
        /Azure AI Project credentials missing/,
      )
    })

    it('throws error when azureClientSecret is missing', () => {
      const modelProvider = {
        id: randomUUID(),
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: null,
        endpoint: 'https://test.cognitiveservices.azure.com/',
      } as any

      assert.throws(
        () => buildAzureAiProjectClient({ modelProvider }),
        /Azure AI Project credentials missing/,
      )
    })

    it('throws error when endpoint is missing', () => {
      const modelProvider = {
        id: randomUUID(),
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: null,
      } as any

      assert.throws(
        () => buildAzureAiProjectClient({ modelProvider }),
        /Azure AI Project credentials missing/,
      )
    })

    it('creates AIProjectClient with valid credentials', () => {
      const modelProvider = {
        id: randomUUID(),
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: 'https://test.cognitiveservices.azure.com/',
      } as any

      const client = buildAzureAiProjectClient({ modelProvider })
      assert.ok(client)
    })
  })

  describe('getAzureAiProjectClient caching', () => {
    it('returns same client instance for same model provider ID', () => {
      const modelProvider = {
        id: randomUUID(),
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: 'https://test.cognitiveservices.azure.com/',
      } as any

      const client1 = getAzureAiProjectClient({ modelProvider })
      const client2 = getAzureAiProjectClient({ modelProvider })

      assert.strictEqual(
        client1,
        client2,
        'Should return cached client instance',
      )
    })

    it('returns different client instances for different model provider IDs', () => {
      const modelProvider1 = {
        id: randomUUID(),
        azureTenantId: 'tenant-id-1',
        azureClientId: 'client-id-1',
        azureClientSecret: 'client-secret-1',
        endpoint: 'https://test1.cognitiveservices.azure.com/',
      } as any

      const modelProvider2 = {
        id: randomUUID(),
        azureTenantId: 'tenant-id-2',
        azureClientId: 'client-id-2',
        azureClientSecret: 'client-secret-2',
        endpoint: 'https://test2.cognitiveservices.azure.com/',
      } as any

      const client1 = getAzureAiProjectClient({ modelProvider: modelProvider1 })
      const client2 = getAzureAiProjectClient({ modelProvider: modelProvider2 })

      assert.notStrictEqual(
        client1,
        client2,
        'Should return different client instances',
      )
    })
  })

  describe('clientAdapter with Azure Agents', () => {
    it('returns azureAiProjectClientAdapter for AZURE_AI_PROJECT model provider type', () => {
      const modelProvider = {
        id: randomUUID(),
        type: ModelProviderType.AZURE_AI_PROJECT,
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: 'https://test.cognitiveservices.azure.com/',
      } as any

      const adapter = clientAdapter({
        modelProvider,
        storageProviderType: StorageProviderType.AZURE_AGENTS,
      })

      assert.ok(adapter)
      assert.strictEqual(adapter.type, 'AZURE_AI_PROJECT')
    })

    it('returns regular Azure OpenAI adapter for AZURE_OPENAI model provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const adapter = clientAdapter({
        modelProvider,
        storageProviderType: StorageProviderType.AZURE_OPENAI,
      })

      assert.ok(adapter)
      assert.strictEqual(adapter.type, 'AZURE_OPENAI')
    })
  })

  describe('storageAssistantId with Azure Agents', () => {
    it('returns azureAgentsAgentId for Azure Agents storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
        },
      })

      const agentId = `agent-${randomUUID()}`
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_AGENTS,
          modelSlug: 'gpt-4o',
          azureAgentsAgentId: agentId,
        },
      })

      // Verify the field was actually saved
      assert.strictEqual(
        assistant.azureAgentsAgentId,
        agentId,
        'azureAgentsAgentId should be saved',
      )

      const result = storageAssistantId({ assistant })
      assert.strictEqual(result, agentId)
    })

    it('returns openaiAssistantId for OpenAI Assistants storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OPENAI,
          apiKey: 'test-api-key',
        },
      })

      const assistantId = `asst_${randomUUID()}`
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.OPENAI,
          openaiAssistantId: assistantId,
        },
      })

      const result = storageAssistantId({ assistant })
      assert.strictEqual(result, assistantId)
    })

    it('returns assistant ID for Superinterface Cloud storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OPENAI,
          apiKey: 'test-api-key',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })

      const result = storageAssistantId({ assistant })
      assert.strictEqual(result, assistant.id)
    })
  })

  describe('storageThreadId with Azure Agents', () => {
    it('returns azureAgentsThreadId for Azure Agents storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_AGENTS,
          modelSlug: 'gpt-4o',
        },
      })

      const threadId = `thread_${randomUUID()}`
      const thread = await prisma.thread.create({
        data: {
          assistantId: assistant.id,
          azureAgentsThreadId: threadId,
        },
        include: {
          assistant: {
            select: {
              storageProviderType: true,
            },
          },
        },
      })

      const result = storageThreadId({ thread })
      assert.strictEqual(result, threadId)
    })

    it('returns openaiThreadId for OpenAI Assistants storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OPENAI,
          apiKey: 'test-api-key',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.OPENAI,
        },
      })

      const threadId = `thread_${randomUUID()}`
      const thread = await prisma.thread.create({
        data: {
          assistantId: assistant.id,
          openaiThreadId: threadId,
        },
        include: {
          assistant: {
            select: {
              storageProviderType: true,
            },
          },
        },
      })

      const result = storageThreadId({ thread })
      assert.strictEqual(result, threadId)
    })

    it('returns openaiConversationId for OpenAI Responses storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OPENAI,
          apiKey: 'test-api-key',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        },
      })

      const conversationId = `conv_${randomUUID()}`
      const thread = await prisma.thread.create({
        data: {
          assistantId: assistant.id,
          openaiConversationId: conversationId,
        },
        include: {
          assistant: {
            select: {
              storageProviderType: true,
            },
          },
        },
      })

      const result = storageThreadId({ thread })
      assert.strictEqual(result, conversationId)
    })

    it('returns thread ID for Superinterface Cloud storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OPENAI,
          apiKey: 'test-api-key',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        },
      })

      const thread = await prisma.thread.create({
        data: {
          assistantId: assistant.id,
        },
        include: {
          assistant: {
            select: {
              storageProviderType: true,
            },
          },
        },
      })

      const result = storageThreadId({ thread })
      assert.strictEqual(result, thread.id)
    })
  })

  describe('Azure Agents with model provider configs', () => {
    it('Azure OpenAI model provider does NOT support Azure Agents storage', async () => {
      const { modelProviderConfigs } = await import(
        '@/lib/modelProviders/modelProviderConfigs'
      )

      const azureOpenaiConfig = modelProviderConfigs.find(
        (config) => config.type === ModelProviderType.AZURE_OPENAI,
      )

      assert.ok(azureOpenaiConfig, 'Azure OpenAI config should exist')
      assert.ok(
        !azureOpenaiConfig.storageProviderTypes.includes(
          StorageProviderType.AZURE_AGENTS,
        ),
        'Azure OpenAI should NOT support Azure Agents storage after adding dedicated AZURE_AGENTS model provider type',
      )
    })

    it('Azure AI Project model provider config exists and only supports AZURE_AGENTS storage', async () => {
      const { modelProviderConfigs } = await import(
        '@/lib/modelProviders/modelProviderConfigs'
      )

      const azureAiProjectConfig = modelProviderConfigs.find(
        (config) => config.type === ModelProviderType.AZURE_AI_PROJECT,
      )

      assert.ok(azureAiProjectConfig, 'Azure AI Project config should exist')
      assert.strictEqual(
        azureAiProjectConfig.slug,
        'azure-ai-project',
        'Azure AI Project config should have correct slug',
      )
      assert.strictEqual(
        azureAiProjectConfig.storageProviderTypes.length,
        1,
        'Azure AI Project should support exactly one storage type',
      )
      assert.ok(
        azureAiProjectConfig.storageProviderTypes.includes(
          StorageProviderType.AZURE_AGENTS,
        ),
        'Azure AI Project should support AZURE_AGENTS storage',
      )
    })
  })

  describe('clientAdapter routing logic comprehensive tests', () => {
    it('AZURE_AI_PROJECT model provider with AZURE_AGENTS storage returns Azure AI Project adapter', () => {
      const modelProvider = {
        id: randomUUID(),
        type: ModelProviderType.AZURE_AI_PROJECT,
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: 'https://test.cognitiveservices.azure.com/',
      } as any

      const adapter = clientAdapter({
        modelProvider,
        storageProviderType: StorageProviderType.AZURE_AGENTS,
      })

      assert.ok(adapter)
      assert.strictEqual(
        adapter.type,
        'AZURE_AI_PROJECT',
        'Should use Azure AI Project adapter',
      )
    })

    it('AZURE_OPENAI model provider with AZURE_OPENAI storage returns regular Azure OpenAI adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const adapter = clientAdapter({
        modelProvider,
        storageProviderType: StorageProviderType.AZURE_OPENAI,
      })

      assert.ok(adapter)
      assert.strictEqual(
        adapter.type,
        'AZURE_OPENAI',
        'Should use regular Azure OpenAI adapter',
      )
    })

    it('AZURE_OPENAI model provider with SUPERINTERFACE_CLOUD storage returns regular Azure OpenAI adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const adapter = clientAdapter({
        modelProvider,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      })

      assert.ok(adapter)
      assert.strictEqual(
        adapter.type,
        'AZURE_OPENAI',
        'Should use regular Azure OpenAI adapter for Superinterface Cloud storage',
      )
    })
  })

  describe('all model provider types return valid adapters', () => {
    it('OPENAI returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OPENAI,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'OPENAI adapter should be created')
      assert.ok(adapter.client, 'OPENAI adapter should have client')
    })

    it('ANTHROPIC returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.ANTHROPIC,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'ANTHROPIC adapter should be created')
      assert.ok(adapter.client, 'ANTHROPIC adapter should have client')
    })

    it('MISTRAL returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.MISTRAL,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'MISTRAL adapter should be created')
      assert.ok(adapter.client, 'MISTRAL adapter should have client')
    })

    it('GROQ returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.GROQ,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'GROQ adapter should be created')
      assert.ok(adapter.client, 'GROQ adapter should have client')
    })

    it('PERPLEXITY returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.PERPLEXITY,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'PERPLEXITY adapter should be created')
      assert.ok(adapter.client, 'PERPLEXITY adapter should have client')
    })

    it('TOGETHER returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.TOGETHER,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'TOGETHER adapter should be created')
      assert.ok(adapter.client, 'TOGETHER adapter should have client')
    })

    it('OLLAMA returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OLLAMA,
          endpoint: 'http://localhost:11434',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'OLLAMA adapter should be created')
      assert.ok(adapter.client, 'OLLAMA adapter should have client')
    })

    it('HUMIRIS returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.HUMIRIS,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'HUMIRIS adapter should be created')
      assert.ok(adapter.client, 'HUMIRIS adapter should have client')
    })

    it('GOOGLE returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.GOOGLE,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'GOOGLE adapter should be created')
      assert.ok(adapter.client, 'GOOGLE adapter should have client')
    })

    it('OPEN_ROUTER returns valid adapter', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.OPEN_ROUTER,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider })
      assert.ok(adapter, 'OPEN_ROUTER adapter should be created')
      assert.ok(adapter.client, 'OPEN_ROUTER adapter should have client')
    })
  })
})
