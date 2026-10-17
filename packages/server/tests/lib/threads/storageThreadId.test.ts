import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Prisma, StorageProviderType } from '@prisma/client'
import { storageThreadId } from '@/lib/threads/storageThreadId'

type ThreadArg = Prisma.ThreadGetPayload<{
  include: {
    assistant: {
      select: {
        storageProviderType: true
      }
    }
  }
}>

describe('storageThreadId', () => {
  it('returns openaiThreadId for OPENAI storage', () => {
    const thread = {
      id: 'local-thread-id',
      openaiThreadId: 'thread_openai123',
      assistant: {
        storageProviderType: StorageProviderType.OPENAI,
      },
    } as unknown as ThreadArg

    assert.strictEqual(storageThreadId({ thread }), 'thread_openai123')
  })

  it('returns openaiThreadId for AZURE_OPENAI storage', () => {
    const thread = {
      id: 'local-thread-id',
      openaiThreadId: 'thread_azure456',
      assistant: {
        storageProviderType: StorageProviderType.AZURE_OPENAI,
      },
    } as unknown as ThreadArg

    assert.strictEqual(storageThreadId({ thread }), 'thread_azure456')
  })

  it('returns azureAgentsThreadId for AZURE_AGENTS storage', () => {
    const thread = {
      id: 'local-thread-id',
      azureAgentsThreadId: 'azure-thread-789',
      assistant: {
        storageProviderType: StorageProviderType.AZURE_AGENTS,
      },
    } as unknown as ThreadArg

    assert.strictEqual(storageThreadId({ thread }), 'azure-thread-789')
  })

  it('returns openaiConversationId for OPENAI_RESPONSES storage', () => {
    const thread = {
      id: 'local-thread-id',
      openaiConversationId: 'conv_openai123',
      assistant: {
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      },
    } as unknown as ThreadArg

    assert.strictEqual(storageThreadId({ thread }), 'conv_openai123')
  })

  it('returns azureOpenaiConversationId for AZURE_RESPONSES storage', () => {
    const thread = {
      id: 'local-thread-id',
      azureOpenaiConversationId: 'conv_azure456',
      assistant: {
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
    } as unknown as ThreadArg

    assert.strictEqual(storageThreadId({ thread }), 'conv_azure456')
  })

  it('returns thread id for SUPERINTERFACE_CLOUD storage', () => {
    const thread = {
      id: 'local-thread-id',
      assistant: {
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      },
    } as unknown as ThreadArg

    assert.strictEqual(storageThreadId({ thread }), 'local-thread-id')
  })
})
