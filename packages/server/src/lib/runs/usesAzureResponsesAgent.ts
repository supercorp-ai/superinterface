import { StorageProviderType, type Assistant } from '@prisma/client'

// Azure Responses assistants that reference an Azure agent, which brings its
// own instructions.
export const usesAzureResponsesAgent = ({
  assistant,
}: {
  assistant: Assistant
}) =>
  assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES &&
  Boolean(assistant.azureResponsesAgentName)
