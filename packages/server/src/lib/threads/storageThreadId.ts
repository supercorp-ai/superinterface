import { Prisma, StorageProviderType } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'

export const storageThreadId = ({
  thread,
}: {
  thread: Prisma.ThreadGetPayload<{
    include: {
      assistant: {
        select: {
          storageProviderType: true
        }
      }
    }
  }>
}) => {
  if (
    isOpenaiAssistantsStorageProvider({
      storageProviderType: thread.assistant.storageProviderType,
    })
  ) {
    return thread.openaiThreadId
  }

  if (
    thread.assistant.storageProviderType ===
    StorageProviderType.OPENAI_RESPONSES
  ) {
    return thread.openaiConversationId
  }

  if (
    thread.assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES
  ) {
    return thread.azureOpenaiConversationId
  }

  if (
    thread.assistant.storageProviderType ===
    StorageProviderType.SUPERINTERFACE_CLOUD
  ) {
    return thread.id
  }

  // The only remaining storage provider type is Azure Agents.
  return thread.azureAgentsThreadId
}
