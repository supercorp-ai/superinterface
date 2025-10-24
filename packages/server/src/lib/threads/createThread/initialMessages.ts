import { Prisma, InitialMessage, Assistant } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'

const role = ({
  message,
  assistant,
}: {
  message: InitialMessage
  assistant: Assistant
}) => {
  if (
    isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return message.role.toLowerCase() as 'user' | 'assistant'
  }

  return message.role as 'user' | 'assistant'
}

export const initialMessages = ({
  assistant,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      initialMessages: true
    }
  }>
}) =>
  assistant.initialMessages.map((message) => ({
    role: role({ message, assistant }),
    content: message.content,
    attachments: message.attachments,
    metadata: message.metadata,
  }))
