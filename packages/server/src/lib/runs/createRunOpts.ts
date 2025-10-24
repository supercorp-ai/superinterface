import type { OpenAI } from 'openai'
import {
  Prisma,
  Thread,
  Assistant,
  TruncationType,
  PrismaClient,
} from '@prisma/client'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'
import { tools } from '@/lib/tools/tools'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'

const instructions = ({ assistant }: { assistant: Assistant }) => {
  if (assistant.instructions.length > 0) {
    return {
      instructions: assistant.instructions,
    }
  }

  if (
    !isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return {
      instructions: '',
    }
  }

  return {}
}

const truncationStrategy = ({ assistant }: { assistant: Assistant }) => {
  if (assistant.truncationType === TruncationType.LAST_MESSAGES) {
    return {
      type: 'last_messages' as const,
      last_messages: assistant.truncationLastMessagesCount,
    }
  } else if (assistant.truncationType === TruncationType.DISABLED) {
    // @ts-expect-error - compat
    return {
      type: 'disabled',
    } as OpenAI.Beta.Threads.Runs.Run.TruncationStrategy
  } else {
    return {
      type: 'auto' as const,
    }
  }
}

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
  ...instructions({ assistant }),
  model: assistant.modelSlug,
  truncation_strategy: truncationStrategy({ assistant }),
  ...(await tools({ assistant, thread, prisma })),
})
