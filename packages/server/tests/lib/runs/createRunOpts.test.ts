import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { StorageProviderType, TruncationType } from '@prisma/client'
import type { Assistant, Thread } from '@prisma/client'
import { createRunOpts } from '../../../src/lib/runs/createRunOpts'

test('Azure Responses: verify instructions are not sent when empty', async () => {
  console.log(
    'Testing that instructions field is omitted when empty for Azure Responses...',
  )

  const mockAssistant = {
    id: 'test-id',
    instructions: '', // Empty
    storageProviderType: StorageProviderType.AZURE_RESPONSES,
    modelSlug: 'gpt-4',
    truncationType: TruncationType.AUTO,
    truncationLastMessagesCount: null,
    openaiAssistantId: null,
    azureResponsesAgentName: 'test-agent',
    tools: [],
    functions: [],
    modelProvider: {
      id: 'provider-id',
      type: 'AZURE_OPENAI',
      apiKey: 'test-key',
      endpoint: 'https://test.openai.azure.com',
    },
    mcpServers: [],
  } as any

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  const runOpts = await createRunOpts({
    assistant: mockAssistant,
    thread: mockThread,
    prisma: mockPrisma,
  })

  // Verify instructions field is NOT present (should be undefined)
  assert.strictEqual(
    'instructions' in runOpts,
    false,
    'Instructions field should not be present when empty for Azure Responses',
  )

  console.log(
    '✅ Instructions field correctly omitted for Azure Responses with empty instructions',
  )
})

test('Azure Responses: verify instructions are not sent when agent is provided', async () => {
  console.log(
    'Testing that instructions field is omitted when agent is provided for Azure Responses...',
  )

  const mockAssistant = {
    id: 'test-id',
    instructions: 'Custom instructions here',
    storageProviderType: StorageProviderType.AZURE_RESPONSES,
    modelSlug: 'gpt-4',
    truncationType: TruncationType.AUTO,
    truncationLastMessagesCount: null,
    openaiAssistantId: null,
    azureResponsesAgentName: 'test-agent',
    tools: [],
    functions: [],
    modelProvider: {
      id: 'provider-id',
      type: 'AZURE_OPENAI',
      apiKey: 'test-key',
      endpoint: 'https://test.openai.azure.com',
    },
    mcpServers: [],
  } as any

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  const runOpts = await createRunOpts({
    assistant: mockAssistant,
    thread: mockThread,
    prisma: mockPrisma,
  })

  // Verify instructions field is NOT present even when provided
  assert.strictEqual(
    'instructions' in runOpts,
    false,
    'Instructions field should not be present when agent is provided',
  )

  console.log(
    '✅ Instructions field correctly omitted for Azure Responses with agent reference',
  )
})

test('OpenAI: verify instructions are not sent when empty', async () => {
  console.log(
    'Testing that OpenAI (Assistants API) omits instructions when empty...',
  )

  const mockAssistant = {
    id: 'test-id',
    instructions: '', // Empty
    storageProviderType: StorageProviderType.OPENAI,
    modelSlug: 'gpt-4',
    truncationType: TruncationType.AUTO,
    truncationLastMessagesCount: null,
    openaiAssistantId: 'asst_123',
    azureAgentsAgentId: null,
    tools: [],
    functions: [],
    modelProvider: {
      id: 'provider-id',
      type: 'OPENAI',
      apiKey: 'test-key',
    },
    mcpServers: [],
  } as any

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  const runOpts = await createRunOpts({
    assistant: mockAssistant,
    thread: mockThread,
    prisma: mockPrisma,
  })

  // Verify instructions field is NOT present
  assert.strictEqual(
    'instructions' in runOpts,
    false,
    'Instructions field should not be present when empty for OpenAI',
  )

  console.log(
    '✅ Instructions field correctly omitted for OpenAI (uses stored instructions)',
  )
})

test('Azure OpenAI: verify instructions are not sent when empty', async () => {
  console.log(
    'Testing that Azure OpenAI (Assistants API) omits instructions when empty...',
  )

  const mockAssistant = {
    id: 'test-id',
    instructions: '', // Empty
    storageProviderType: StorageProviderType.AZURE_OPENAI,
    modelSlug: 'gpt-4',
    truncationType: TruncationType.AUTO,
    truncationLastMessagesCount: null,
    openaiAssistantId: 'asst_123',
    azureAgentsAgentId: null,
    tools: [],
    functions: [],
    modelProvider: {
      id: 'provider-id',
      type: 'AZURE_OPENAI',
      apiKey: 'test-key',
      endpoint: 'https://test.openai.azure.com',
    },
    mcpServers: [],
  } as any

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  const runOpts = await createRunOpts({
    assistant: mockAssistant,
    thread: mockThread,
    prisma: mockPrisma,
  })

  // Verify instructions field is NOT present
  assert.strictEqual(
    'instructions' in runOpts,
    false,
    'Instructions field should not be present when empty for Azure OpenAI',
  )

  console.log(
    '✅ Instructions field correctly omitted for Azure OpenAI (uses stored instructions)',
  )
})

test('Azure Agents: verify instructions are not sent when empty', async () => {
  console.log('Testing that Azure Agents omits instructions when empty...')

  const mockAssistant = {
    id: 'test-id',
    instructions: '', // Empty
    storageProviderType: StorageProviderType.AZURE_AGENTS,
    modelSlug: 'gpt-4',
    truncationType: TruncationType.AUTO,
    truncationLastMessagesCount: null,
    openaiAssistantId: null,
    azureAgentsAgentId: 'agent-123',
    tools: [],
    functions: [],
    modelProvider: {
      id: 'provider-id',
      type: 'AZURE_OPENAI',
      apiKey: 'test-key',
      endpoint: 'https://test.openai.azure.com',
    },
    mcpServers: [],
  } as any

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  const runOpts = await createRunOpts({
    assistant: mockAssistant,
    thread: mockThread,
    prisma: mockPrisma,
  })

  // Verify instructions field is NOT present
  assert.strictEqual(
    'instructions' in runOpts,
    false,
    'Instructions field should not be present when empty for Azure Agents',
  )

  console.log(
    '✅ Instructions field correctly omitted for Azure Agents (uses stored instructions)',
  )
})

test('OpenAI Responses: verify instructions are always sent', async () => {
  console.log('Testing that OpenAI Responses always sends instructions...')

  const mockAssistant = {
    id: 'test-id',
    instructions: '', // Empty
    storageProviderType: StorageProviderType.OPENAI_RESPONSES,
    modelSlug: 'gpt-4',
    truncationType: TruncationType.AUTO,
    truncationLastMessagesCount: null,
    openaiAssistantId: null,
    azureAgentsAgentId: null,
    tools: [],
    functions: [],
    modelProvider: {
      id: 'provider-id',
      type: 'OPENAI',
      apiKey: 'test-key',
    },
    mcpServers: [],
  } as any

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  const runOpts = await createRunOpts({
    assistant: mockAssistant,
    thread: mockThread,
    prisma: mockPrisma,
  })

  // Verify instructions field IS present (even when empty)
  assert.ok(
    'instructions' in runOpts,
    'Instructions field should be present for OpenAI Responses even when empty',
  )
  assert.strictEqual(
    runOpts.instructions,
    '',
    'Instructions should be empty string for OpenAI Responses',
  )

  console.log(
    '✅ Instructions field correctly included for OpenAI Responses (always sent)',
  )
})

test('SUPERINTERFACE_CLOUD: verify instructions are always sent', async () => {
  console.log('Testing that SUPERINTERFACE_CLOUD always sends instructions...')

  const mockAssistant = {
    id: 'test-id',
    instructions: '', // Empty
    storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
    modelSlug: 'gpt-4',
    truncationType: TruncationType.AUTO,
    truncationLastMessagesCount: null,
    openaiAssistantId: null,
    azureAgentsAgentId: null,
    tools: [],
    functions: [],
    modelProvider: {
      id: 'provider-id',
      type: 'OPENAI',
      apiKey: 'test-key',
    },
    mcpServers: [],
  } as any

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  const runOpts = await createRunOpts({
    assistant: mockAssistant,
    thread: mockThread,
    prisma: mockPrisma,
  })

  // Verify instructions field IS present (even when empty)
  assert.ok(
    'instructions' in runOpts,
    'Instructions field should be present for SUPERINTERFACE_CLOUD even when empty',
  )
  assert.strictEqual(
    runOpts.instructions,
    '',
    'Instructions should be empty string for SUPERINTERFACE_CLOUD',
  )

  console.log(
    '✅ Instructions field correctly included for SUPERINTERFACE_CLOUD (always sent)',
  )
})

test('All storage providers: verify instructions are sent when provided', async () => {
  console.log(
    'Testing that all storage providers send instructions when provided...',
  )

  const storageProviderTypes = [
    StorageProviderType.AZURE_RESPONSES,
    StorageProviderType.OPENAI,
    StorageProviderType.AZURE_OPENAI,
    StorageProviderType.AZURE_AGENTS,
    StorageProviderType.OPENAI_RESPONSES,
    StorageProviderType.SUPERINTERFACE_CLOUD,
  ]

  const mockThread = {
    id: 'test-thread',
  } as Thread

  const mockPrisma = {} as any

  for (const storageProviderType of storageProviderTypes) {
    const isAzureResponses =
      storageProviderType === StorageProviderType.AZURE_RESPONSES

    const mockAssistant = {
      id: 'test-id',
      instructions: 'Custom instructions for testing',
      storageProviderType,
      modelSlug: 'gpt-4',
      truncationType: TruncationType.AUTO,
      truncationLastMessagesCount: null,
      openaiAssistantId:
        storageProviderType === StorageProviderType.OPENAI ||
        storageProviderType === StorageProviderType.AZURE_OPENAI
          ? 'asst_123'
          : null,
      azureAgentsAgentId:
        storageProviderType === StorageProviderType.AZURE_AGENTS
          ? 'agent-123'
          : null,
      azureResponsesAgentName: isAzureResponses ? 'agent-123' : null,
      tools: [],
      functions: [],
      modelProvider: {
        id: 'provider-id',
        type: 'OPENAI',
        apiKey: 'test-key',
      },
      mcpServers: [],
    } as any

    const runOpts = await createRunOpts({
      assistant: mockAssistant,
      thread: mockThread,
      prisma: mockPrisma,
    })

    if (isAzureResponses) {
      assert.ok(
        !('instructions' in runOpts),
        'Instructions field should be omitted for Azure Responses with agent reference',
      )
    } else {
      // Verify instructions field IS present and has the right value
      assert.ok(
        'instructions' in runOpts,
        `Instructions field should be present when provided for ${storageProviderType}`,
      )
      assert.strictEqual(
        runOpts.instructions,
        'Custom instructions for testing',
        `Instructions should match the provided value for ${storageProviderType}`,
      )
    }
  }

  console.log(
    '✅ Instructions field correctly included for all storage providers when custom instructions provided',
  )
})
