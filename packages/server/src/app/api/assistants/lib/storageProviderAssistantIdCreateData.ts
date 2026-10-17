import { StorageProviderType } from '@prisma/client'

// Stores the provider-side assistant id in the column for the storage
// provider type.
export const storageProviderAssistantIdCreateData = ({
  storageProviderType,
  storageProviderAssistantId,
}: {
  storageProviderType: StorageProviderType
  storageProviderAssistantId: string | null | undefined
}) => {
  if (storageProviderType === StorageProviderType.AZURE_AGENTS) {
    return { azureAgentsAgentId: storageProviderAssistantId }
  }

  if (storageProviderType === StorageProviderType.AZURE_RESPONSES) {
    return { azureResponsesAgentName: storageProviderAssistantId ?? null }
  }

  return { openaiAssistantId: storageProviderAssistantId ?? null }
}
