import { Assistant, StorageProviderType } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'

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
    return assistant.id
  }

  if (
    assistant.storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD
  ) {
    return assistant.id
  }

  throw new Error('Invalid storage type')
}
