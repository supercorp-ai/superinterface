import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  ModelProviderType,
  StorageProviderType,
  type ModelProvider,
} from '@prisma/client'
import { getStorageProviderType } from '@/lib/storageProviders/getStorageProviderType'

const modelProviderOf = ({ type }: { type: ModelProviderType }) =>
  ({ type }) as ModelProvider

describe('getStorageProviderType', () => {
  it('maps OpenAI and Azure OpenAI providers to their assistant storage', () => {
    assert.strictEqual(
      getStorageProviderType({
        modelProvider: modelProviderOf({ type: ModelProviderType.OPENAI }),
      }),
      StorageProviderType.OPENAI,
    )
    assert.strictEqual(
      getStorageProviderType({
        modelProvider: modelProviderOf({
          type: ModelProviderType.AZURE_OPENAI,
        }),
      }),
      StorageProviderType.AZURE_OPENAI,
    )
  })

  it('returns null for providers without assistant storage', () => {
    for (const type of [
      ModelProviderType.ANTHROPIC,
      ModelProviderType.OLLAMA,
      ModelProviderType.AZURE_AI_PROJECT,
    ]) {
      assert.strictEqual(
        getStorageProviderType({ modelProvider: modelProviderOf({ type }) }),
        null,
        type,
      )
    }
  })
})
