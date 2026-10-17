import type { Assistant } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'

// OpenAI Assistants storage needs the assistant created on OpenAI first.
export const isAssistantSetupIncomplete = ({
  assistant,
}: {
  assistant: Assistant
}) =>
  isOpenaiAssistantsStorageProvider({
    storageProviderType: assistant.storageProviderType,
  }) && !assistant.openaiAssistantId
