import dayjs from 'dayjs'
import type OpenAI from 'openai'
import {
  Prisma,
  Assistant,
  StorageProviderType,
  MessageRole,
} from '@prisma/client'
import { optimisticId, serializeMessage } from '@superinterface/react/utils'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'

const assistantId = ({ assistant }: { assistant: Assistant }) => {
  if (
    isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return assistant.openaiAssistantId
  }

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    if (
      assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES &&
      assistant.azureResponsesAgentName
    ) {
      return assistant.azureResponsesAgentName
    }
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
    return assistant.azureAgentsAgentId
  }

  throw new Error('Invalid storage type')
}

export const initialMessagesResponse = async ({
  assistant,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      initialMessages: true
    }
  }>
}) => {
  const threadId = optimisticId()
  const initialCreatedAt = dayjs().unix()

  return {
    data: await Promise.all(
      assistant.initialMessages.map(
        async (
          message: (typeof assistant.initialMessages)[number],
          index: number,
        ) =>
          serializeMessage({
            message: {
              id: optimisticId(),
              role: message.role.toLowerCase() as OpenAI.Beta.Threads.Messages.Message['role'],
              created_at: initialCreatedAt - index - 1,
              object:
                'thread.message' as OpenAI.Beta.Threads.Messages.Message['object'],
              content: [
                {
                  type: 'text',
                  text: {
                    annotations: [],
                    value: message.content,
                  },
                } as OpenAI.Beta.Threads.Messages.TextContentBlock,
              ],
              run_id: null,
              assistant_id:
                message.role === MessageRole.ASSISTANT
                  ? assistantId({ assistant })
                  : null,
              thread_id: threadId,
              attachments:
                message.attachments as OpenAI.Beta.Threads.Messages.Message['attachments'],
              metadata: message.metadata,
              completed_at: initialCreatedAt - index - 1,
              incomplete_at: null,
              incomplete_details: null,
              status: 'completed',
              runSteps: [],
            },
          }),
      ),
    ),
    hasNextPage: false,
    lastId: null,
  }
}
