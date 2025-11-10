import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AIProjectClient } from '@azure/ai-projects'
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

const buildAzureAiProjectClient = () => {
  if (
    !process.env.TEST_AZURE_AI_PROJECT_ENDPOINT ||
    !process.env.TEST_AZURE_TENANT_ID ||
    !process.env.TEST_AZURE_CLIENT_ID ||
    !process.env.TEST_AZURE_CLIENT_SECRET
  ) {
    throw new Error('Azure credentials not configured')
  }

  const credential = new ClientSecretCredential(
    process.env.TEST_AZURE_TENANT_ID,
    process.env.TEST_AZURE_CLIENT_ID,
    process.env.TEST_AZURE_CLIENT_SECRET,
  )

  return new AIProjectClient(
    process.env.TEST_AZURE_AI_PROJECT_ENDPOINT,
    credential,
  )
}

const skipIfMissingAzureCreds = (t: any) => {
  if (!process.env.TEST_AZURE_AI_PROJECT_ENDPOINT) {
    t.skip('TEST_AZURE_AI_PROJECT_ENDPOINT env var not set')
  }
  if (!process.env.TEST_AZURE_TENANT_ID) {
    t.skip('TEST_AZURE_TENANT_ID env var not set')
  }
  if (!process.env.TEST_AZURE_CLIENT_ID) {
    t.skip('TEST_AZURE_CLIENT_ID env var not set')
  }
  if (!process.env.TEST_AZURE_CLIENT_SECRET) {
    t.skip('TEST_AZURE_CLIENT_SECRET env var not set')
  }
}

describe('Azure Agents Integration Tests', () => {
  it('should handle FILE_SEARCH tool with empty vector store without crashing', async (t) => {
    skipIfMissingAzureCreds(t)

    const azureClient = buildAzureAiProjectClient()

    // Create a vector store with NO files (this triggers the bug)
    const vectorStore = await azureClient.agents.vectorStores.create({
      name: 'Empty Vector Store for FILE_SEARCH Test',
    })
    console.log('Created empty vector store:', vectorStore.id)

    try {
      // Create agent with file_search tool but NO files in the vector store
      const fileSearchAgent = await azureClient.agents.createAgent('gpt-4.1', {
        name: 'Test File Search Empty Agent',
        instructions:
          'You are a file search assistant. Use the file_search tool to find information.',
        tools: [{ type: 'file_search' }],
        toolResources: {
          fileSearch: {
            vectorStoreIds: [vectorStore.id],
          },
        },
      })
      console.log(
        'Created file search agent with empty vector store:',
        fileSearchAgent.id,
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
            storageProviderType: StorageProviderType.AZURE_AGENTS,
            azureAgentsAgentId: fileSearchAgent.id,
            instructions:
              'You are a file search assistant. Use the file_search tool to find information.',
          },
        })

        // Build the POST handler
        const postHandler = buildPOST({ prisma })

        // Create a mock request
        const requestBody = JSON.stringify({
          publicApiKey: publicKey.value,
          assistantId: assistant.id,
          content:
            'What is the secret code in the file? Reply with just the code.',
        })

        const mockRequest = new Request(
          'http://localhost:3000/api/cloud/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: requestBody,
          },
        ) as any

        // Call the handler
        console.log(
          'Sending message to FILE_SEARCH agent with empty vector store...',
        )
        const response = await postHandler(mockRequest)

        console.log('Response status:', response.status)
        console.log(
          'Response headers:',
          Object.fromEntries(response.headers.entries()),
        )
        assert.strictEqual(response.status, 200, 'Should return 200 status')
        assert.ok(response.body, 'Should have response body')

        // Read the stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let allEvents: any[] = []
        let errorOccurred = false
        let errorMessage = ''
        let rawChunks: string[] = []

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('Stream ended')
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            rawChunks.push(chunk)
            console.log('Received chunk:', chunk.substring(0, 200))
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6))
                  allEvents.push(event)
                  console.log('Parsed event:', event.event)

                  // Log step events to see what's happening
                  if (event.event?.startsWith('thread.run.step')) {
                    console.log(
                      'Step event:',
                      event.event,
                      'step_details:',
                      event.data?.step_details,
                    )
                  }
                } catch (e) {
                  // Ignore parse errors for non-JSON lines
                  console.log('Failed to parse line:', line.substring(0, 100))
                }
              }
            }
          }
        } catch (error: any) {
          errorOccurred = true
          errorMessage = error.message
          console.error('Stream error:', error)
          console.error('Error stack:', error.stack)

          // This is the error we're trying to fix:
          // "Cannot read properties of undefined (reading 'type')"
          if (
            error.message.includes(
              "Cannot read properties of undefined (reading 'type')",
            )
          ) {
            throw new Error(
              'REPRODUCED BUG: Step event with undefined step_details crashed OpenAI SDK',
            )
          }
          throw error
        }

        // If we get here without error, the fix is working!
        console.log('✅ FILE_SEARCH with empty vector store handled gracefully')
        console.log('Total events received:', allEvents.length)
        console.log('Total raw chunks:', rawChunks.length)

        // The assistant should respond that it can't find the file or has no information
        assert.ok(
          !errorOccurred,
          `Should not crash with undefined step_details error: ${errorMessage}`,
        )

        // Note: The stream might be empty if Azure returns no events, which is also valid
        // The important thing is that it doesn't crash
        console.log('Test passed without crashing')
      } finally {
        await azureClient.agents.deleteAgent(fileSearchAgent.id)
      }
    } finally {
      await azureClient.agents.vectorStores.delete(vectorStore.id)
    }
  })
})
