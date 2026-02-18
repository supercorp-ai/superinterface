import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestApiKey } from '../lib/apiKeys/createTestApiKey'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { clientAdapter } from '@/lib/modelProviders/clientAdapter'
import { buildPOST } from '@/app/api/messages/buildRoute'

const googleApiKey = process.env.TEST_GOOGLE_API_KEY

describe('Google', () => {
  describe('clientAdapter', () => {
    it('returns valid adapter for GOOGLE model provider', async () => {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.GOOGLE,
          apiKey: 'test-key',
        },
      })

      const adapter = clientAdapter({ modelProvider } as any)
      assert.ok(adapter, 'GOOGLE adapter should be created')
      assert.ok(adapter.client, 'GOOGLE adapter should have client')
    })
  })

  describe('model provider config', () => {
    it('Google config supports SUPERINTERFACE_CLOUD storage', async () => {
      const { modelProviderConfigs } =
        await import('@/lib/modelProviders/modelProviderConfigs')

      const googleConfig = modelProviderConfigs.find(
        (config) => config.type === ModelProviderType.GOOGLE,
      )

      assert.ok(googleConfig, 'Google config should exist')
      assert.ok(
        googleConfig.storageProviderTypes.includes(
          StorageProviderType.SUPERINTERFACE_CLOUD,
        ),
        'Google should support SUPERINTERFACE_CLOUD storage',
      )
    })

    it('Google config has function calling available', async () => {
      const { modelProviderConfigs } =
        await import('@/lib/modelProviders/modelProviderConfigs')

      const googleConfig = modelProviderConfigs.find(
        (config) => config.type === ModelProviderType.GOOGLE,
      )

      assert.ok(googleConfig, 'Google config should exist')
      assert.strictEqual(
        googleConfig.isFunctionCallingAvailable,
        true,
        'Google should have function calling available',
      )
    })
  })

  describe('integration', () => {
    it('should send message and receive response via Google', async () => {
      if (!googleApiKey) {
        console.log('Skipping: TEST_GOOGLE_API_KEY not set')
        return
      }

      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.GOOGLE,
          apiKey: googleApiKey,
        },
      })

      const publicKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gemini-3-flash-preview',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
          instructions:
            'You are a helpful assistant. Keep responses very brief.',
        },
      })

      const postHandler = buildPOST({ prisma })

      const mockRequest = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicApiKey: publicKey.value,
          assistantId: assistant.id,
          content: 'What is 2 + 2? Reply with just the number.',
        }),
      }) as any

      const response = await postHandler(mockRequest)
      assert.strictEqual(response.status, 200, 'Should return 200 status')
      assert.ok(response.body, 'Should have response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let threadId: string | null = null
      let messageReceived = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        try {
          const event = JSON.parse(chunk)

          if (event.event === 'thread.created') {
            threadId = event.data?.id
          }

          if (
            event.event === 'thread.message.delta' &&
            event.data?.delta?.content?.[0]?.text?.value
          ) {
            messageReceived = true
          }
        } catch {
          // Ignore parse errors for non-JSON chunks
        }
      }

      assert.ok(
        messageReceived,
        'Should receive message content from assistant',
      )
      assert.ok(threadId, 'Should have thread ID from stream')

      const thread = await prisma.thread.findFirst({
        where: { assistantId: assistant.id },
      })
      assert.ok(thread, 'Thread should be created in database')
    })

    it('should handle multiple messages in same thread', async () => {
      if (!googleApiKey) {
        console.log('Skipping: TEST_GOOGLE_API_KEY not set')
        return
      }

      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.GOOGLE,
          apiKey: googleApiKey,
        },
      })

      const publicKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gemini-3-flash-preview',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
          instructions:
            'You are a helpful assistant. Keep responses very brief.',
        },
      })

      const postHandler = buildPOST({ prisma })
      let threadId: string | null = null

      const sendMessage = async (content: string) => {
        const request = new Request('http://localhost:3000/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicApiKey: publicKey.value,
            assistantId: assistant.id,
            ...(threadId ? { threadId } : {}),
            content,
          }),
        }) as any

        const response = await postHandler(request)
        assert.strictEqual(response.status, 200)

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let messageContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          try {
            const event = JSON.parse(chunk)

            if (event.event === 'thread.created' && !threadId) {
              threadId = event.data?.id
            }

            if (
              event.event === 'thread.message.delta' &&
              event.data?.delta?.content?.[0]?.text?.value
            ) {
              messageContent += event.data.delta.content[0].text.value
            }
          } catch {
            // Ignore parse errors
          }
        }

        return messageContent
      }

      const response1 = await sendMessage('Say "First" and nothing else.')
      assert.ok(
        response1.length > 0,
        'Should receive response to first message',
      )

      const response2 = await sendMessage('Say "Second" and nothing else.')
      assert.ok(
        response2.length > 0,
        'Should receive response to second message',
      )

      assert.ok(threadId, 'Should have captured thread ID')

      const thread = await prisma.thread.findFirst({
        where: { assistantId: assistant.id },
      })
      assert.ok(thread, 'Thread should exist in database')
    })

    it('should handle function calling', async () => {
      if (!googleApiKey) {
        console.log('Skipping: TEST_GOOGLE_API_KEY not set')
        return
      }

      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.GOOGLE,
          apiKey: googleApiKey,
        },
      })

      const publicKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gemini-3-flash-preview',
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
          instructions:
            'You are a billing assistant. You can ONLY look up information by calling functions. You have no data yourself.',
        },
      })

      await prisma.function.create({
        data: {
          assistantId: assistant.id,
          openapiSpec: {
            name: 'get_account_balance',
            description:
              'Look up the account balance for a given user ID in the billing database',
            parameters: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  description: 'The user ID to look up',
                },
              },
              required: ['user_id'],
            },
          },
        },
      })

      const postHandler = buildPOST({ prisma })

      const mockRequest = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicApiKey: publicKey.value,
          assistantId: assistant.id,
          content: 'What is the account balance for user ID usr_abc123?',
        }),
      }) as any

      const response = await postHandler(mockRequest)
      assert.strictEqual(response.status, 200)
      assert.ok(response.body)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let requiresActionReceived = false
      let functionName = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        try {
          const event = JSON.parse(chunk)

          if (event.event === 'thread.run.requires_action') {
            requiresActionReceived = true
            const toolCalls =
              event.data?.required_action?.submit_tool_outputs?.tool_calls
            if (toolCalls && toolCalls.length > 0) {
              functionName = toolCalls[0]?.function?.name
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      assert.ok(
        requiresActionReceived,
        'Should receive thread.run.requires_action event',
      )
      assert.strictEqual(
        functionName,
        'get_account_balance',
        'Should call get_account_balance function',
      )
    })
  })
})
