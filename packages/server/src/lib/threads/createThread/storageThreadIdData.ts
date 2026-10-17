import { StorageProviderType } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'

// The thread column that points at the storage provider's copy of the thread.
// Superinterface Cloud threads are their own storage, so they need none.
export const storageThreadIdData = ({
  storageProviderType,
  storageThreadId,
}: {
  storageProviderType: StorageProviderType
  storageThreadId: string
}) => {
  if (isOpenaiAssistantsStorageProvider({ storageProviderType })) {
    return { openaiThreadId: storageThreadId }
  }

  if (storageProviderType === StorageProviderType.OPENAI_RESPONSES) {
    return { openaiConversationId: storageThreadId }
  }

  if (storageProviderType === StorageProviderType.AZURE_RESPONSES) {
    return { azureOpenaiConversationId: storageThreadId }
  }

  if (storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD) {
    return {}
  }

  // The only remaining storage provider type is Azure Agents.
  return { azureAgentsThreadId: storageThreadId }
}
