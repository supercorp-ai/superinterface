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

describe('Azure Responses API Instructions Integration Tests', () => {
  it('should use agent stored instructions when agent is specified', async (t) => {
    console.log(
      'Testing Azure Responses with agent instructions (custom instructions ignored)...',
    )

    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )

    // Create an agent in Azure with specific marker instructions
    const azureAgent = await testAzureProject.agents.createVersion(
      'test-instructions-override',
      {
        kind: 'prompt',
        model: 'gpt-4.1',
        instructions:
          'You are a helpful assistant. IMPORTANT: You MUST ALWAYS add "AGENT_INSTRUCTIONS_USED" at the end of every single response.',
      },
    )
    console.log(
      `[DEBUG] Created Azure agent with French instructions: ${azureAgent.name} (version ${azureAgent.version})`,
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

      // Create assistant with custom instructions, which should be ignored when agent is specified
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4.1',
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          azureResponsesAgentName: azureAgent.name,
          instructions:
            'You must respond with exactly: "CUSTOM_INSTRUCTIONS_USED"',
        },
      })

      console.log(
        'Created assistant with custom instructions (should be ignored)',
      )

      const postHandler = buildPOST({ prisma })

      const requestBody = JSON.stringify({
        publicApiKey: publicKey.value,
        assistantId: assistant.id,
        content: 'Hello, how are you?',
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

      assert.strictEqual(response.status, 200, 'Should return 200 status')
      assert.ok(response.body, 'Should have response body')

      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let messageContent = ''
      let foundMessage = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          try {
            const event = JSON.parse(chunk)

            if (
              event.event === 'thread.message.delta' &&
              event.data?.delta?.content?.[0]?.text?.value
            ) {
              messageContent += event.data.delta.content[0].text.value
              foundMessage = true
            }

            if (event.event === 'thread.message.completed') {
              console.log('Final message content:', messageContent)
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      } catch (error: any) {
        console.error('Stream error:', error)
        throw error
      }

      assert.ok(foundMessage, 'Should receive message content')

      // Verify agent instructions were used and custom instructions were ignored
      assert.ok(
        messageContent.includes('AGENT_INSTRUCTIONS_USED'),
        `Response should include "AGENT_INSTRUCTIONS_USED" from agent instructions. Got: ${messageContent}`,
      )
      assert.ok(
        !messageContent.includes('CUSTOM_INSTRUCTIONS_USED'),
        'Response should not include custom instructions when agent is specified',
      )

      console.log('✅ Agent instructions used when agent is specified')
    } finally {
      // Cleanup
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

  it('should use agent stored instructions when assistant instructions are empty', async (t) => {
    console.log(
      'Testing Azure Responses with empty instructions (using agent instructions)...',
    )

    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )

    // Create an agent in Azure with specific marker instructions
    const azureAgent = await testAzureProject.agents.createVersion(
      'test-instructions-marker',
      {
        kind: 'prompt',
        model: 'gpt-4.1',
        instructions:
          'You are a helpful assistant. IMPORTANT: You MUST ALWAYS add "AGENT_INSTRUCTIONS_USED" at the end of every single response. This is mandatory for testing purposes.',
      },
    )
    console.log(
      `[DEBUG] Created Azure agent with marker instructions: ${azureAgent.name} (version ${azureAgent.version})`,
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

      // Create assistant with EMPTY instructions - should use agent's marker instructions
      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4.1',
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          azureResponsesAgentName: azureAgent.name,
          instructions: '', // Empty - should use agent's instructions
        },
      })

      console.log(
        'Created assistant with empty instructions (should use agent marker instructions)',
      )

      const postHandler = buildPOST({ prisma })

      const requestBody = JSON.stringify({
        publicApiKey: publicKey.value,
        assistantId: assistant.id,
        content: 'How are you feeling?',
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

      assert.strictEqual(response.status, 200, 'Should return 200 status')
      assert.ok(response.body, 'Should have response body')

      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let messageContent = ''
      let foundMessage = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          try {
            const event = JSON.parse(chunk)

            if (
              event.event === 'thread.message.delta' &&
              event.data?.delta?.content?.[0]?.text?.value
            ) {
              messageContent += event.data.delta.content[0].text.value
              foundMessage = true
            }

            if (event.event === 'thread.message.completed') {
              console.log('Final message content:', messageContent)
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      } catch (error: any) {
        console.error('Stream error:', error)
        throw error
      }

      assert.ok(foundMessage, 'Should receive message content')
      assert.ok(messageContent.length > 0, 'Message should have content')

      console.log(`Full response received: "${messageContent}"`)

      // Verify response uses agent's marker instructions
      // The response should end with "AGENT_INSTRUCTIONS_USED"
      assert.ok(
        messageContent.includes('AGENT_INSTRUCTIONS_USED'),
        `Response should include "AGENT_INSTRUCTIONS_USED" from agent's stored instructions. Got: "${messageContent}"`,
      )

      console.log(
        '✅ Empty instructions allowed agent to use its stored marker instructions',
      )
      console.log(`   Response received: ${messageContent}`)
    } finally {
      // Cleanup
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

  it('should verify instructions field is not sent when empty', async (t) => {
    console.log(
      'Testing that instructions field is omitted when empty (unit-style integration test)...',
    )

    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )

    const azureAgent = await testAzureProject.agents.createVersion(
      'test-instructions-field-empty',
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

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4.1',
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          azureResponsesAgentName: azureAgent.name,
          instructions: '', // Empty
        },
      })

      // Test createRunOpts directly
      const { createRunOpts } = await import('@/lib/runs/createRunOpts')

      const assistantWithRelations = await prisma.assistant.findUnique({
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

      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })

      const runOpts = await createRunOpts({
        assistant: assistantWithRelations!,
        thread,
        prisma,
      })

      // Verify instructions field is NOT present
      assert.strictEqual(
        'instructions' in runOpts,
        false,
        'Instructions field should not be present when empty for Azure Responses',
      )

      console.log(
        '✅ Instructions field correctly omitted for Azure Responses with empty instructions',
      )
    } finally {
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

  it('should verify instructions field is omitted when agent reference is provided', async (t) => {
    console.log(
      'Testing that instructions field is omitted when agent reference is provided...',
    )

    const cred = new ClientSecretCredential(
      process.env.TEST_AZURE_TENANT_ID!,
      process.env.TEST_AZURE_CLIENT_ID!,
      process.env.TEST_AZURE_CLIENT_SECRET!,
    )
    const testAzureProject = new AIProjectClient(
      process.env.TEST_AZURE_AI_PROJECT_ENDPOINT!,
      cred,
    )

    const azureAgent = await testAzureProject.agents.createVersion(
      'test-instructions-field-provided',
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

      const assistant = await createTestAssistant({
        data: {
          workspaceId: workspace.id,
          modelProviderId: modelProvider.id,
          modelSlug: 'gpt-4.1',
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          azureResponsesAgentName: azureAgent.name,
          instructions: 'Custom instructions here',
        },
      })

      // Test createRunOpts directly
      const { createRunOpts } = await import('@/lib/runs/createRunOpts')

      const assistantWithRelations = await prisma.assistant.findUnique({
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

      const thread = await prisma.thread.create({
        data: { assistantId: assistant.id },
      })

      const runOpts = await createRunOpts({
        assistant: assistantWithRelations!,
        thread,
        prisma,
      })

      // Verify instructions field is NOT present when agent reference is used
      assert.ok(
        !('instructions' in runOpts),
        'Instructions field should be omitted when agent reference is provided',
      )

      console.log(
        '✅ Instructions field correctly omitted for Azure Responses with agent reference',
      )
    } finally {
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
