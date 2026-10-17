import { StorageProviderType } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'

// Storage providers that speak the OpenAI Assistants (threads and runs) API.
export const isAssistantsApiStorageProvider = ({
  storageProviderType,
}: {
  storageProviderType: StorageProviderType
}) =>
  isOpenaiAssistantsStorageProvider({ storageProviderType }) ||
  isAzureAgentsStorageProvider({ storageProviderType })
