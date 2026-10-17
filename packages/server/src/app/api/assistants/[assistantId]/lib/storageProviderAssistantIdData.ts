import { StorageProviderType } from '@prisma/client'

// Stores the provider-side assistant id in the column for the storage
// provider type and clears the columns of the other providers.
export const storageProviderAssistantIdData = ({
  storageProviderType,
  storageProviderAssistantId,
}: {
  storageProviderType: StorageProviderType
  storageProviderAssistantId: string | null
}) => {
  if (storageProviderType === StorageProviderType.AZURE_AGENTS) {
    return {
      azureAgentsAgentId: storageProviderAssistantId,
      openaiAssistantId: null,
      azureResponsesAgentName: null,
    }
  }

  if (storageProviderType === StorageProviderType.AZURE_RESPONSES) {
    return {
      azureResponsesAgentName: storageProviderAssistantId,
      openaiAssistantId: null,
      azureAgentsAgentId: null,
    }
  }

  return {
    openaiAssistantId: storageProviderAssistantId,
    azureAgentsAgentId: null,
    azureResponsesAgentName: null,
  }
}
