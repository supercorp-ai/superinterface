import assert from 'node:assert'
import { describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import { ModelProviderType, StorageProviderType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { responsesStorageProviderTypes } from '@/lib/storageProviders/responsesStorageProviderTypes'
import { clientAdapter } from '@/lib/modelProviders/clientAdapter'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'
import { storageThreadId } from '@/lib/threads/storageThreadId'

describe('Azure OpenAI Responses Storage Provider', () => {
  describe('isResponsesStorageProvider', () => {
    it('returns true for AZURE_RESPONSES storage provider type', () => {
      const result = isResponsesStorageProvider({
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      })
      assert.strictEqual(result, true)
    })

    it('returns true for OPENAI_RESPONSES storage provider type', () => {
      const result = isResponsesStorageProvider({
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      })
      assert.strictEqual(result, true)
    })

    it('returns false for non-Responses storage provider types', () => {
      const types = [
        StorageProviderType.OPENAI,
        StorageProviderType.AZURE_OPENAI,
        StorageProviderType.AZURE_AGENTS,
        StorageProviderType.SUPERINTERFACE_CLOUD,
      ]

      for (const type of types) {
        const result = isResponsesStorageProvider({
          storageProviderType: type,
        })
        assert.strictEqual(result, false, `Expected ${type} to return false`)
      }
    })
  })

  describe('responsesStorageProviderTypes', () => {
    it('includes both OPENAI_RESPONSES and AZURE_RESPONSES types', () => {
      assert.ok(
        responsesStorageProviderTypes.includes(
          StorageProviderType.OPENAI_RESPONSES,
        ),
        'Should include OPENAI_RESPONSES',
      )
      assert.ok(
        responsesStorageProviderTypes.includes(
          StorageProviderType.AZURE_RESPONSES,
        ),
        'Should include AZURE_RESPONSES',
      )
    })

    it('includes exactly 2 types', () => {
      assert.strictEqual(
        responsesStorageProviderTypes.length,
        2,
        'Should have exactly 2 Responses storage types',
      )
    })
  })

  describe('clientAdapter with Azure OpenAI Responses', () => {
    it('returns Azure OpenAI adapter for AZURE_OPENAI model provider with AZURE_RESPONSES storage', async () => {
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
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      })

      assert.ok(adapter)
      assert.strictEqual(adapter.type, 'AZURE_OPENAI')
    })

    it('Azure OpenAI client adapter works for both Assistants API and Responses API', async () => {
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

      // Both should return the same adapter type
      const assistantsAdapter = clientAdapter({
        modelProvider,
        storageProviderType: StorageProviderType.AZURE_OPENAI,
      })

      const responsesAdapter = clientAdapter({
        modelProvider,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      })

      assert.strictEqual(
        assistantsAdapter.type,
        responsesAdapter.type,
        'Both should use the same Azure OpenAI client adapter',
      )
      assert.strictEqual(assistantsAdapter.type, 'AZURE_OPENAI')
    })
  })

  describe('storageAssistantId with Azure OpenAI Responses', () => {
    it('returns assistant.id for AZURE_RESPONSES storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          modelSlug: 'gpt-4o',
        },
      })

      const result = storageAssistantId({ assistant })
      assert.strictEqual(
        result,
        assistant.id,
        'Should return assistant.id (Azure Responses API uses internal IDs)',
      )
    })

    it('returns assistant.id for OPENAI_RESPONSES storage provider', async () => {
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

      const result = storageAssistantId({ assistant })
      assert.strictEqual(
        result,
        assistant.id,
        'Should return assistant ID (Responses API does not use external assistant IDs)',
      )
    })

    it('returns openaiAssistantId for AZURE_OPENAI Assistants API storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const assistantId = `asst_${randomUUID()}`
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_OPENAI,
          openaiAssistantId: assistantId,
        },
      })

      const result = storageAssistantId({ assistant })
      assert.strictEqual(
        result,
        assistantId,
        'Assistants API should use external assistant ID',
      )
    })
  })

  describe('storageThreadId with Azure OpenAI Responses', () => {
    it('returns azureOpenaiConversationId for AZURE_RESPONSES storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          modelSlug: 'gpt-4o',
        },
      })

      const conversationId = `conv_${randomUUID()}`
      const thread = await prisma.thread.create({
        data: {
          assistantId: assistant.id,
          azureOpenaiConversationId: conversationId,
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

    it('returns openaiConversationId for OPENAI_RESPONSES storage provider', async () => {
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

    it('returns openaiThreadId for AZURE_OPENAI Assistants API storage provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_OPENAI,
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
      assert.strictEqual(
        result,
        threadId,
        'Assistants API should use thread ID, not conversation ID',
      )
    })
  })

  describe('Azure OpenAI Responses with model provider configs', () => {
    it('Azure OpenAI model provider config supports AZURE_RESPONSES storage', async () => {
      const { modelProviderConfigs } =
        await import('@/lib/modelProviders/modelProviderConfigs')

      const azureOpenaiConfig = modelProviderConfigs.find(
        (config) => config.type === ModelProviderType.AZURE_OPENAI,
      )

      assert.ok(azureOpenaiConfig, 'Azure OpenAI config should exist')
      assert.ok(
        azureOpenaiConfig.storageProviderTypes.includes(
          StorageProviderType.AZURE_RESPONSES,
        ),
        'Azure OpenAI should support AZURE_RESPONSES storage',
      )
    })

    it('Azure OpenAI model provider supports all expected storage types', async () => {
      const { modelProviderConfigs } =
        await import('@/lib/modelProviders/modelProviderConfigs')

      const azureOpenaiConfig = modelProviderConfigs.find(
        (config) => config.type === ModelProviderType.AZURE_OPENAI,
      )

      assert.ok(azureOpenaiConfig, 'Azure OpenAI config should exist')

      const expectedStorageTypes = [
        StorageProviderType.AZURE_OPENAI, // Assistants API
        StorageProviderType.SUPERINTERFACE_CLOUD, // Managed storage
        StorageProviderType.AZURE_RESPONSES, // Responses API
      ]

      for (const storageType of expectedStorageTypes) {
        assert.ok(
          azureOpenaiConfig.storageProviderTypes.includes(storageType),
          `Azure OpenAI should support ${storageType} storage`,
        )
      }
    })

    it('Azure OpenAI model provider does NOT support Azure Agents storage', async () => {
      const { modelProviderConfigs } =
        await import('@/lib/modelProviders/modelProviderConfigs')

      const azureOpenaiConfig = modelProviderConfigs.find(
        (config) => config.type === ModelProviderType.AZURE_OPENAI,
      )

      assert.ok(azureOpenaiConfig, 'Azure OpenAI config should exist')
      assert.ok(
        !azureOpenaiConfig.storageProviderTypes.includes(
          StorageProviderType.AZURE_AGENTS,
        ),
        'Azure OpenAI should NOT support AZURE_AGENTS storage (use AZURE_AI_PROJECT model provider instead)',
      )
    })
  })

  describe('Responses API vs Assistants API distinction', () => {
    it('Azure Responses API uses agent names while OpenAI Responses uses internal IDs', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      // Azure Responses API uses agent names when provided
      const azureResponsesAssistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          modelSlug: 'gpt-4o',
          azureResponsesAgentName: 'agent_test_name',
        },
      })

      const azureResponsesId = storageAssistantId({
        assistant: azureResponsesAssistant,
      })
      assert.strictEqual(
        azureResponsesId,
        azureResponsesAssistant.azureResponsesAgentName,
        'Azure Responses API should use agent name when provided',
      )

      // Create Assistants API assistant for comparison
      const assistantsAssistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_OPENAI,
          openaiAssistantId: `asst_${randomUUID()}`,
        },
      })

      // Assistants API should use external assistant ID
      const assistantsId = storageAssistantId({
        assistant: assistantsAssistant,
      })
      assert.strictEqual(
        assistantsId,
        assistantsAssistant.openaiAssistantId,
        'Assistants API should use external ID',
      )
      assert.notStrictEqual(
        assistantsId,
        assistantsAssistant.id,
        'Assistants API should NOT use internal ID',
      )
    })

    it('Responses API uses conversation IDs, Assistants API uses thread IDs', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      // Responses API thread
      const responsesAssistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
        },
      })

      const conversationId = `conv_${randomUUID()}`
      const responsesThread = await prisma.thread.create({
        data: {
          assistantId: responsesAssistant.id,
          azureOpenaiConversationId: conversationId,
        },
        include: {
          assistant: {
            select: {
              storageProviderType: true,
            },
          },
        },
      })

      // Assistants API thread
      const assistantsAssistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_OPENAI,
        },
      })

      const threadId = `thread_${randomUUID()}`
      const assistantsThread = await prisma.thread.create({
        data: {
          assistantId: assistantsAssistant.id,
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

      // Verify different ID types are used
      const responsesStorageId = storageThreadId({ thread: responsesThread })
      const assistantsStorageId = storageThreadId({
        thread: assistantsThread,
      })

      assert.strictEqual(
        responsesStorageId,
        conversationId,
        'Responses API should use conversation ID',
      )
      assert.strictEqual(
        assistantsStorageId,
        threadId,
        'Assistants API should use thread ID',
      )
    })
  })

  describe('AZURE_RESPONSES database field usage', () => {
    it('uses azureOpenaiConversationId field, not openaiConversationId', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_OPENAI,
          apiKey: 'test-api-key',
          endpoint: 'https://test.openai.azure.com/',
          apiVersion: '2024-02-15-preview',
        },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
        },
      })

      const azureConvId = `conv_azure_${randomUUID()}`
      const thread = await prisma.thread.create({
        data: {
          assistantId: assistant.id,
          azureOpenaiConversationId: azureConvId,
          // Intentionally NOT setting openaiConversationId
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
      assert.strictEqual(
        result,
        azureConvId,
        'Should read from azureOpenaiConversationId field',
      )
      assert.strictEqual(
        thread.openaiConversationId,
        null,
        'openaiConversationId should remain null for Azure',
      )
    })

    it('OPENAI_RESPONSES uses openaiConversationId field, not azureOpenaiConversationId', async () => {
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

      const openaiConvId = `conv_openai_${randomUUID()}`
      const thread = await prisma.thread.create({
        data: {
          assistantId: assistant.id,
          openaiConversationId: openaiConvId,
          // Intentionally NOT setting azureOpenaiConversationId
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
      assert.strictEqual(
        result,
        openaiConvId,
        'Should read from openaiConversationId field',
      )
      assert.strictEqual(
        thread.azureOpenaiConversationId,
        null,
        'azureOpenaiConversationId should remain null for OpenAI',
      )
    })
  })
})
