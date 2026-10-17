import { StorageProviderType } from '@prisma/client'
import { openaiAssistantsStorageProviderTypes } from '@/lib/storageProviders/openaiAssistantsStorageProviderTypes'
import { azureAgentsStorageProviderTypes } from '@/lib/storageProviders/azureAgentsStorageProviderTypes'

// Storage providers that keep their own copy of the assistant's instructions:
// OpenAI Assistants, Azure Agents and the Azure Responses API.
const storedInstructionsStorageProviderTypes: StorageProviderType[] = [
  ...openaiAssistantsStorageProviderTypes,
  ...azureAgentsStorageProviderTypes,
  StorageProviderType.AZURE_RESPONSES,
]

export const hasStoredInstructions = ({
  storageProviderType,
}: {
  storageProviderType: StorageProviderType
}) => storedInstructionsStorageProviderTypes.includes(storageProviderType)
