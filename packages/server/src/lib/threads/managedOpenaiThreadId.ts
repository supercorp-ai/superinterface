import { Prisma, StorageProviderType, type PrismaClient } from '@prisma/client'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'

export const managedOpenaiThreadId = async ({
  assistant,
  threadId,
  prisma,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      tools: {
        include: {
          fileSearchTool: true
          webSearchTool: true
          imageGenerationTool: true
          codeInterpreterTool: true
          computerUseTool: true
        }
      }
      mcpServers: {
        include: {
          computerUseTool: true
          stdioTransport: true
          sseTransport: true
          httpTransport: true
        }
      }
      functions: true
      modelProvider: true
    }
  }>
  threadId: string
  prisma: PrismaClient
}) => {
  const newStorageThread = await assistantClientAdapter({
    assistant,
    prisma,
  }).beta.threads.create({
    metadata: {
      assistantId: assistant.id,
      threadId,
    },
  })

  await prisma.thread.update({
    where: {
      id: threadId,
    },
    data: {
      ...(isOpenaiAssistantsStorageProvider({
        storageProviderType: assistant.storageProviderType,
      })
        ? {
            openaiThreadId: newStorageThread.id,
          }
        : {}),
      ...(assistant.storageProviderType === StorageProviderType.OPENAI_RESPONSES
        ? {
            openaiConversationId: newStorageThread.id,
          }
        : {}),
      ...(assistant.storageProviderType ===
      StorageProviderType.AZURE_OPENAI_RESPONSES
        ? {
            azureOpenaiConversationId: newStorageThread.id,
          }
        : {}),
      ...(isAzureAgentsStorageProvider({
        storageProviderType: assistant.storageProviderType,
      })
        ? {
            azureAgentsThreadId: newStorageThread.id,
          }
        : {}),
    },
  })

  return newStorageThread.id
}
