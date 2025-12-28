import { AIProjectClient as AIProjectClientV1 } from '@azure/ai-projects'
import { AIProjectClient as AIProjectClientV2 } from '@azure/ai-projects-v2'
import { ModelProvider, StorageProviderType } from '@prisma/client'
import { buildAzureAiProjectClient } from './buildAzureAiProjectClient'

// Cache to store Azure AI Project clients by model provider ID and storage type
// This ensures we reuse the same client instance across clientAdapter, storageAdapter, and runAdapter
const azureAiProjectClients = new Map<
  string,
  AIProjectClientV1 | AIProjectClientV2
>()

export const getAzureAiProjectClient = ({
  modelProvider,
  storageProviderType,
}: {
  modelProvider: ModelProvider
  storageProviderType: StorageProviderType
}): AIProjectClientV1 | AIProjectClientV2 => {
  // Cache key includes both model provider ID and storage type
  const cacheKey = `${modelProvider.id}-${storageProviderType}`

  const cached = azureAiProjectClients.get(cacheKey)
  if (cached) {
    return cached
  }

  const client = buildAzureAiProjectClient({
    modelProvider,
    storageProviderType,
  })
  azureAiProjectClients.set(cacheKey, client)
  return client
}
