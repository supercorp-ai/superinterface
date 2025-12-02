import assert from 'node:assert'
import { describe, it } from 'node:test'
import { ModelProviderType, type ModelProvider } from '@prisma/client'
import { serializeModelProvider } from '@/lib/modelProviders/serializeModelProvider'

const baseProvider: Omit<ModelProvider, 'type'> = {
  id: 'provider-1',
  name: 'Test Provider',
  apiKey: 'key',
  endpoint: 'https://example.com',
  apiVersion: '2024-01-01',
  azureTenantId: 'tenant',
  azureClientId: 'client',
  azureClientSecret: 'secret',
  workspaceId: 'workspace-1',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
}

describe('serializeModelProvider', () => {
  it('omits workspaceId and azure fields for non-AZURE_AI_PROJECT providers', () => {
    const provider: ModelProvider = {
      ...baseProvider,
      type: ModelProviderType.OPENAI,
    }

    const serialized = serializeModelProvider({ provider })

    assert.strictEqual(serialized.type, ModelProviderType.OPENAI)
    assert.ok(!('workspaceId' in serialized))
    assert.ok(!('azureTenantId' in serialized))
    assert.ok(!('azureClientId' in serialized))
    assert.ok(!('azureClientSecret' in serialized))
  })

  it('includes azure fields for AZURE_AI_PROJECT providers', () => {
    const provider: ModelProvider = {
      ...baseProvider,
      type: ModelProviderType.AZURE_AI_PROJECT,
    }

    const serialized = serializeModelProvider({ provider })

    assert.strictEqual(serialized.azureTenantId, provider.azureTenantId)
    assert.strictEqual(serialized.azureClientId, provider.azureClientId)
    assert.strictEqual(serialized.azureClientSecret, provider.azureClientSecret)
    assert.ok(!('workspaceId' in serialized))
  })
})
