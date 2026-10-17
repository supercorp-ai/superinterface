import type { Prisma, Thread, PrismaClient } from '@prisma/client'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'
import { tools } from '@/lib/tools/tools'
import { runInstructions } from './runInstructions'
import { truncationStrategy } from './truncationStrategy'

export const createRunOpts = async ({
  assistant,
  thread,
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
      functions: true
      modelProvider: true
      mcpServers: {
        include: {
          computerUseTool: true
          stdioTransport: true
          httpTransport: true
          sseTransport: true
        }
      }
    }
  }>
  thread: Thread
  prisma: PrismaClient
}) => ({
  stream: true,
  assistant_id: storageAssistantId({ assistant }),
  ...runInstructions({ assistant }),
  model: assistant.modelSlug,
  truncation_strategy: truncationStrategy({ assistant }),
  ...(await tools({ assistant, thread, prisma })),
})
