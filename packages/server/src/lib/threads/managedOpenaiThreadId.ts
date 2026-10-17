import type { Prisma, PrismaClient } from '@prisma/client'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { storageThreadIdData } from '@/lib/threads/createThread/storageThreadIdData'

// Creates the storage provider's thread for an existing thread row and
// records its id on the row. Only called for OpenAI Assistants and Responses
// storage providers.
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
  const { beta } = assistantClientAdapter({ assistant, prisma })

  const { id: storageThreadId } = await beta.threads.create({
    metadata: {
      assistantId: assistant.id,
      threadId,
    },
  })

  await prisma.thread.update({
    where: {
      id: threadId,
    },
    data: storageThreadIdData({
      storageProviderType: assistant.storageProviderType,
      storageThreadId,
    }),
  })

  return storageThreadId
}
