import { describe, it } from 'node:test'
import assert from 'node:assert'
import { StorageProviderType } from '@prisma/client'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'

describe('storageAssistantId', () => {
  it('returns openaiAssistantId for OPENAI storage', () => {
    const assistant = {
      id: 'local-assistant-id',
      openaiAssistantId: 'asst_openai123',
      storageProviderType: StorageProviderType.OPENAI,
    } as any

    assert.strictEqual(storageAssistantId({ assistant }), 'asst_openai123')
  })

  it('returns openaiAssistantId for AZURE_OPENAI storage', () => {
    const assistant = {
      id: 'local-assistant-id',
      openaiAssistantId: 'asst_azure456',
      storageProviderType: StorageProviderType.AZURE_OPENAI,
    } as any

    assert.strictEqual(storageAssistantId({ assistant }), 'asst_azure456')
  })

  it('returns azureAgentsAgentId for AZURE_AGENTS storage', () => {
    const assistant = {
      id: 'local-assistant-id',
      azureAgentsAgentId: 'agent_789',
      storageProviderType: StorageProviderType.AZURE_AGENTS,
    } as any

    assert.strictEqual(storageAssistantId({ assistant }), 'agent_789')
  })

  it('returns assistant id for OPENAI_RESPONSES storage', () => {
    const assistant = {
      id: 'local-assistant-id',
      storageProviderType: StorageProviderType.OPENAI_RESPONSES,
    } as any

    assert.strictEqual(storageAssistantId({ assistant }), 'local-assistant-id')
  })

  it('returns assistant id for AZURE_OPENAI_RESPONSES storage', () => {
    const assistant = {
      id: 'local-assistant-id',
      storageProviderType: StorageProviderType.AZURE_OPENAI_RESPONSES,
    } as any

    assert.strictEqual(storageAssistantId({ assistant }), 'local-assistant-id')
  })

  it('returns assistant id for SUPERINTERFACE_CLOUD storage', () => {
    const assistant = {
      id: 'local-assistant-id',
      storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
    } as any

    assert.strictEqual(storageAssistantId({ assistant }), 'local-assistant-id')
  })

  it('throws error for invalid storage type', () => {
    const assistant = {
      id: 'local-assistant-id',
      storageProviderType: 'INVALID_TYPE' as any,
    } as any

    assert.throws(
      () => storageAssistantId({ assistant }),
      /Invalid storage type/,
    )
  })
})
