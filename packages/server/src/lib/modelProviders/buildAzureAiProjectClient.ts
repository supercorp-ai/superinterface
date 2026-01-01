import { AIProjectClient as AIProjectClientV1 } from '@azure/ai-projects'
import { AIProjectClient as AIProjectClientV2 } from '@azure/ai-projects-v2'
import { ClientSecretCredential } from '@azure/identity'
import { ModelProvider, StorageProviderType } from '@prisma/client'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'

export const buildAzureAiProjectClient = ({
  storageProviderType,
  modelProvider,
}: {
  storageProviderType: StorageProviderType
  modelProvider: ModelProvider
}) => {
  const { azureTenantId, azureClientId, azureClientSecret, endpoint } =
    modelProvider

  if (!azureTenantId || !azureClientId || !azureClientSecret || !endpoint) {
    throw new Error(
      'Azure AI Project credentials missing. Please configure azureTenantId, azureClientId, azureClientSecret, and endpoint in ModelProvider.',
    )
  }

  const credential = new ClientSecretCredential(
    azureTenantId,
    azureClientId,
    azureClientSecret,
  )

  // Use v2 SDK for Responses API (AZURE_RESPONSES), v1 SDK for Azure Agents
  const useV2 = isResponsesStorageProvider({ storageProviderType })

  const azureAiProject = useV2
    ? new AIProjectClientV2(endpoint, credential)
    : new AIProjectClientV1(endpoint, credential)

  return azureAiProject
}
