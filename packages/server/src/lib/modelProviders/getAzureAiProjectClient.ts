import { AIProjectClient } from '@azure/ai-projects'
import { ModelProvider } from '@prisma/client'
import { buildAzureAiProjectClient } from './buildAzureAiProjectClient'

// Cache to store Azure AI Project clients by model provider ID
// This ensures we reuse the same client instance across clientAdapter, storageAdapter, and runAdapter
const azureAiProjectClients = new Map<string, AIProjectClient>()

export const getAzureAiProjectClient = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}): AIProjectClient => {
  const cached = azureAiProjectClients.get(modelProvider.id)
  if (cached) {
    return cached
  }

  const client = buildAzureAiProjectClient({ modelProvider })
  azureAiProjectClients.set(modelProvider.id, client)
  return client
}
