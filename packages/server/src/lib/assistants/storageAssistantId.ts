import { Assistant, StorageProviderType } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'

export const storageAssistantId = ({ assistant }: { assistant: Assistant }) => {
  if (
    isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return assistant.openaiAssistantId!
  }

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    // For Azure Responses API with agent references, use the agent ID
    if (
      assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES &&
      assistant.azureResponsesAgentName
    ) {
      return assistant.azureResponsesAgentName
    }
    // For OpenAI Responses or Azure Responses without agent reference, use internal ID
    return assistant.id
  }

  if (
    assistant.storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD
  ) {
    return assistant.id
  }

  if (
    isAzureAgentsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return assistant.azureAgentsAgentId!
  }

  throw new Error('Invalid storage type')
}
