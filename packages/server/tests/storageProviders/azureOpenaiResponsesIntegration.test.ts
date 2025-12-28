import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AIProjectClient } from '@azure/ai-projects-v2'
import { ClientSecretCredential } from '@azure/identity'
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
import { buildPOST } from '@/app/api/messages/buildRoute'

describe('Azure OpenAI Responses API Integration Tests', () => {
  it('should create conversation and send messages using Azure OpenAI Responses API', async (t) => {
    // Debug: Check if Azure AI Project Client returns a client with responses API
    const { AIProjectClient } = await import('@azure/ai-projects-v2')
    const { ClientSecretCredential } = await import('@azure/identity')
    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )
    const openaiClient = await testAzureProject.getOpenAIClient()
    console.log(
      '[DEBUG] OpenAI client has responses?',
      'responses' in openaiClient,
    )
    console.log('[DEBUG] OpenAI client type:', openaiClient.constructor.name)
    console.log('[DEBUG] OpenAI client baseURL:', (openaiClient as any).baseURL)

    // Create an agent in Azure first (required for Responses API)
    const azureAgent = await testAzureProject.agents.createVersion(
      'test-responses-superinterface',
      {
        kind: 'prompt',
        model: 'gpt-4.1', // Using deployment name that exists in Azure
        instructions: 'You are a helpful assistant. Keep responses very brief.',
      },
    )
    console.log(
      `[DEBUG] Created Azure agent: ${azureAgent.name} (version ${azureAgent.version})`,
    )

    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.AZURE_AI_PROJECT,
        endpoint: process.env.TEST_AZURE_AI_PROJECT_ENDPOINT,
        azureTenantId: process.env.TEST_AZURE_TENANT_ID,
        azureClientId: process.env.TEST_AZURE_CLIENT_ID,
        azureClientSecret: process.env.TEST_AZURE_CLIENT_SECRET,
        apiVersion: '2025-03-01-preview', // Responses API version
      },
    })

    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })

    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        modelSlug: 'gpt-4.1', // Must match the deployment name
        storageProviderType: StorageProviderType.AZURE_OPENAI_RESPONSES,
        instructions: 'You are a helpful assistant. Keep responses very brief.',
      },
    })

    console.log(
      'Created assistant with AZURE_OPENAI_RESPONSES storage:',
      assistant.id,
    )

    try {
      // Build the POST handler for messages
      const postHandler = buildPOST({ prisma })

      // Create a request to send a message (this will auto-create a thread)
      const requestBody = JSON.stringify({
        publicApiKey: publicKey.value,
        assistantId: assistant.id,
        content: 'Say "Hello from Azure Responses API" and nothing else.',
      })

      const mockRequest = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      }) as any

      console.log('Sending message to Azure OpenAI Responses API...')
      const response = await postHandler(mockRequest)

      console.log('Response status:', response.status)

      // If we get an error, log the response body
      if (response.status !== 200) {
        try {
          const errorText = await response.text()
          console.error('Error response body:', errorText)

          // Try to parse as JSON for better error details
          try {
            const errorJson = JSON.parse(errorText)
            console.error('Parsed error:', JSON.stringify(errorJson, null, 2))
          } catch {
            console.error('Could not parse error as JSON')
          }
        } catch (e) {
          console.error('Could not read error response:', e)
        }
      }

      assert.strictEqual(response.status, 200, 'Should return 200 status')
      assert.ok(response.body, 'Should have response body')

      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let allEvents: any[] = []
      let threadId: string | null = null
      let conversationId: string | null = null
      let messageReceived = false
      let rawChunks: string[] = []

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('Stream ended')
            console.log('[DEBUG] Total raw chunks received:', rawChunks.length)
            if (rawChunks.length > 0) {
              console.log(
                '[DEBUG] First chunk:',
                rawChunks[0].substring(0, 200),
              )
            }
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          rawChunks.push(chunk)

          // Try parsing as raw JSON (for Responses API adapters)
          try {
            const event = JSON.parse(chunk)
            allEvents.push(event)

            // Log interesting events
            if (event.event === 'thread.created') {
              threadId = event.data?.id
              console.log('Thread created:', threadId)
            }

            if (
              event.event === 'thread.message.delta' &&
              event.data?.delta?.content?.[0]?.text?.value
            ) {
              messageReceived = true
              console.log(
                'Received message delta:',
                event.data.delta.content[0].text.value,
              )
            }

            if (event.event === 'thread.run.completed') {
              console.log('Run completed:', event.data?.id)
            }
          } catch (e) {
            // Ignore parse errors for non-JSON chunks
          }
        }
      } catch (error: any) {
        console.error('Stream error:', error)
        throw error
      }

      console.log('Total events received:', allEvents.length)
      assert.ok(
        messageReceived,
        'Should receive message content from assistant',
      )
      assert.ok(threadId, 'Should have thread ID from stream')

      // Verify thread was created in database with azureOpenaiConversationId
      const thread = await prisma.thread.findFirst({
        where: {
          assistantId: assistant.id,
        },
        include: {
          assistant: true,
        },
      })

      assert.ok(thread, 'Thread should be created in database')
      assert.ok(
        thread!.azureOpenaiConversationId,
        'Thread should have azureOpenaiConversationId',
      )
      assert.strictEqual(
        thread!.openaiConversationId,
        null,
        'Thread should NOT have openaiConversationId (Azure uses separate field)',
      )
      assert.strictEqual(
        thread!.openaiThreadId,
        null,
        'Thread should NOT have openaiThreadId (Responses API uses conversation ID)',
      )

      console.log('✅ Azure OpenAI Responses API integration test passed')
      console.log(
        'Conversation ID (from DB):',
        thread!.azureOpenaiConversationId,
      )
    } finally {
      // Cleanup: Delete the Azure agent
      try {
        await testAzureProject.agents.deleteVersion(
          azureAgent.name,
          azureAgent.version,
        )
        console.log(`[DEBUG] Cleaned up Azure agent: ${azureAgent.name}`)
      } catch (error) {
        console.error('[DEBUG] Failed to cleanup Azure agent:', error)
      }
    }
  })

  it('should handle multiple messages in same conversation', async (t) => {
    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )

    // Create an agent in Azure
    const azureAgent = await testAzureProject.agents.createVersion(
      'test-responses-multiple-msgs',
      {
        kind: 'prompt',
        model: 'gpt-4.1',
        instructions: 'You are a helpful assistant. Keep responses very brief.',
      },
    )

    try {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_AI_PROJECT,
          endpoint: process.env.TEST_AZURE_AI_PROJECT_ENDPOINT,
          azureTenantId: process.env.TEST_AZURE_TENANT_ID,
          azureClientId: process.env.TEST_AZURE_CLIENT_ID,
          azureClientSecret: process.env.TEST_AZURE_CLIENT_SECRET,
          apiVersion: '2025-03-01-preview',
        },
      })

      const publicKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4.1',
          storageProviderType: StorageProviderType.AZURE_OPENAI_RESPONSES,
          instructions:
            'You are a helpful assistant. Keep responses very brief.',
        },
      })

      // Send messages - first message will auto-create thread
      const postHandler = buildPOST({ prisma })
      let threadId: string | null = null

      const sendMessage = async (content: string) => {
        const request = new Request('http://localhost:3000/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            publicApiKey: publicKey.value,
            assistantId: assistant.id,
            ...(threadId ? { threadId } : {}), // Include threadId if we have one
            content,
          }),
        }) as any

        const response = await postHandler(request)
        assert.strictEqual(response.status, 200)

        // Consume the stream
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let messageContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          // Parse as raw JSON (for Responses API adapters)
          try {
            const event = JSON.parse(chunk)

            // Capture thread ID from thread.created event
            if (event.event === 'thread.created' && !threadId) {
              threadId = event.data?.id
              console.log('Thread created:', threadId)
            }

            if (
              event.event === 'thread.message.delta' &&
              event.data?.delta?.content?.[0]?.text?.value
            ) {
              messageContent += event.data.delta.content[0].text.value
            }
          } catch (e) {
            // Ignore parse errors for non-JSON chunks
          }
        }

        return messageContent
      }

      console.log('Sending first message...')
      const response1 = await sendMessage('Say "First" and nothing else.')
      console.log('Response 1:', response1)
      assert.ok(
        response1.length > 0,
        'Should receive response to first message',
      )

      console.log('Sending second message...')
      const response2 = await sendMessage('Say "Second" and nothing else.')
      console.log('Response 2:', response2)
      assert.ok(
        response2.length > 0,
        'Should receive response to second message',
      )

      console.log('Sending third message...')
      const response3 = await sendMessage('Say "Third" and nothing else.')
      console.log('Response 3:', response3)
      assert.ok(
        response3.length > 0,
        'Should receive response to third message',
      )

      // Verify thread still has same conversation ID
      assert.ok(threadId, 'Should have captured thread ID from first message')

      const thread = await prisma.thread.findFirst({
        where: { azureOpenaiConversationId: threadId! },
      })

      assert.ok(thread, 'Thread should exist')
      assert.ok(
        thread!.azureOpenaiConversationId,
        'Thread should maintain same azureOpenaiConversationId',
      )

      console.log(
        '✅ Successfully sent multiple messages in same Azure OpenAI Responses conversation',
      )
    } finally {
      // Cleanup: Delete the Azure agent
      try {
        await testAzureProject.agents.deleteVersion(
          azureAgent.name,
          azureAgent.version,
        )
        console.log(`[DEBUG] Cleaned up Azure agent: ${azureAgent.name}`)
      } catch (error) {
        console.error('[DEBUG] Failed to cleanup Azure agent:', error)
      }
    }
  })

  it('should handle function calling with Azure OpenAI Responses API', async (t) => {
    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )

    // Create an agent in Azure
    const azureAgent = await testAzureProject.agents.createVersion(
      'test-responses-function-calling',
      {
        kind: 'prompt',
        model: 'gpt-4.1',
        instructions:
          'You are a helpful assistant. When asked about weather, say you need a weather API.',
      },
    )

    try {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_AI_PROJECT,
          endpoint: process.env.TEST_AZURE_AI_PROJECT_ENDPOINT,
          azureTenantId: process.env.TEST_AZURE_TENANT_ID,
          azureClientId: process.env.TEST_AZURE_CLIENT_ID,
          azureClientSecret: process.env.TEST_AZURE_CLIENT_SECRET,
          apiVersion: '2025-03-01-preview',
        },
      })

      const publicKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4.1',
          storageProviderType: StorageProviderType.AZURE_OPENAI_RESPONSES,
          instructions:
            'You are a helpful assistant. When asked about weather, use the get_weather function.',
        },
      })

      // Add a function to the assistant
      await prisma.function.create({
        data: {
          assistantId: assistant.id,
          openapiSpec: {
            name: 'get_weather',
            description: 'Get the current weather for a location',
            parameters: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'The city name',
                },
              },
              required: ['location'],
            },
          },
        },
      })

      console.log('Created assistant with function calling tool:', assistant.id)

      const postHandler = buildPOST({ prisma })

      const requestBody = JSON.stringify({
        publicApiKey: publicKey.value,
        assistantId: assistant.id,
        content: "What's the weather in Tokyo?",
      })

      const mockRequest = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      }) as any

      console.log(
        'Sending message that should trigger function call to Azure OpenAI...',
      )
      const response = await postHandler(mockRequest)

      assert.strictEqual(response.status, 200)
      assert.ok(response.body)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let functionCallReceived = false
      let functionName = ''
      let requiresActionReceived = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          // Parse as raw JSON (for Responses API adapters)
          try {
            const event = JSON.parse(chunk)

            if (event.event === 'thread.run.requires_action') {
              requiresActionReceived = true
              const toolCalls =
                event.data?.required_action?.submit_tool_outputs?.tool_calls
              if (toolCalls && toolCalls.length > 0) {
                functionCallReceived = true
                functionName = toolCalls[0]?.function?.name
                console.log(
                  'Function call received:',
                  functionName,
                  'with args:',
                  toolCalls[0]?.function?.arguments,
                )
              }
            }
          } catch (e) {
            // Ignore parse errors for non-JSON chunks
          }
        }
      } catch (error: any) {
        console.error('Stream error:', error)
        throw error
      }

      assert.ok(
        requiresActionReceived,
        'Should receive thread.run.requires_action event',
      )
      assert.ok(functionCallReceived, 'Should receive function call')
      assert.strictEqual(
        functionName,
        'get_weather',
        'Should call get_weather function',
      )

      console.log('✅ Azure OpenAI Responses API function calling test passed')
    } finally {
      // Cleanup: Delete the Azure agent
      try {
        await testAzureProject.agents.deleteVersion(
          azureAgent.name,
          azureAgent.version,
        )
        console.log(`[DEBUG] Cleaned up Azure agent: ${azureAgent.name}`)
      } catch (error) {
        console.error('[DEBUG] Failed to cleanup Azure agent:', error)
      }
    }
  })

  it('should store and retrieve conversation metadata correctly', async (t) => {
    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )

    // Create an agent in Azure
    const azureAgent = await testAzureProject.agents.createVersion(
      'test-responses-metadata',
      {
        kind: 'prompt',
        model: 'gpt-4.1',
        instructions: 'You are a helpful assistant.',
      },
    )

    try {
      const workspace = await createTestWorkspace()
      const modelProvider = await createTestModelProvider({
        data: {
          workspaceId: workspace.id,
          type: ModelProviderType.AZURE_AI_PROJECT,
          endpoint: process.env.TEST_AZURE_AI_PROJECT_ENDPOINT,
          azureTenantId: process.env.TEST_AZURE_TENANT_ID,
          azureClientId: process.env.TEST_AZURE_CLIENT_ID,
          azureClientSecret: process.env.TEST_AZURE_CLIENT_SECRET,
          apiVersion: '2025-03-01-preview',
        },
      })

      const publicKey = await createTestApiKey({
        data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
      })

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4.1',
          storageProviderType: StorageProviderType.AZURE_OPENAI_RESPONSES,
          instructions: 'You are a helpful assistant.',
        },
      })

      const postHandler = buildPOST({ prisma })

      const requestBody = JSON.stringify({
        publicApiKey: publicKey.value,
        assistantId: assistant.id,
        content: 'Say hi',
      })

      const mockRequest = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      }) as any

      console.log('Sending message to create conversation...')
      const response = await postHandler(mockRequest)
      assert.strictEqual(response.status, 200)

      // Consume stream
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let conversationId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              if (event.event === 'thread.created') {
                conversationId = event.data?.id
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }

      // Wait a bit for metadata to be saved
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Verify thread was created with correct fields
      const thread = await prisma.thread.findFirst({
        where: {
          assistantId: assistant.id,
        },
      })

      assert.ok(thread, 'Thread should exist in database')
      assert.ok(
        thread!.azureOpenaiConversationId,
        'Should have azureOpenaiConversationId',
      )
      assert.strictEqual(
        thread!.openaiConversationId,
        null,
        'Should NOT have openaiConversationId',
      )
      assert.strictEqual(
        thread!.openaiThreadId,
        null,
        'Should NOT have openaiThreadId',
      )
      assert.strictEqual(
        thread!.azureAgentsThreadId,
        null,
        'Should NOT have azureAgentsThreadId',
      )

      console.log(
        '✅ Conversation metadata stored correctly with azureOpenaiConversationId:',
        thread!.azureOpenaiConversationId,
      )
    } finally {
      // Cleanup: Delete the Azure agent
      try {
        await testAzureProject.agents.deleteVersion(
          azureAgent.name,
          azureAgent.version,
        )
        console.log(`[DEBUG] Cleaned up Azure agent: ${azureAgent.name}`)
      } catch (error) {
        console.error('[DEBUG] Failed to cleanup Azure agent:', error)
      }
    }
  })
})
