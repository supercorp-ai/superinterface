import type { OpenAI } from 'openai'
import {
  Prisma,
  Thread,
  Assistant,
  TruncationType,
  PrismaClient,
  StorageProviderType,
} from '@prisma/client'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'
import { tools } from '@/lib/tools/tools'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'

const instructions = ({ assistant }: { assistant: Assistant }) => {
  if (
    assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES &&
    assistant.azureResponsesAgentName
  ) {
    return {}
  }

  if (assistant.instructions.length > 0) {
    return {
      instructions: assistant.instructions,
    }
  }

  // For storage providers that have their own stored instructions
  // (OpenAI Assistants, Azure Agents, Azure Responses API), omit the field entirely
  // so the provider uses the stored instructions
  const hasStoredInstructions =
    isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    }) ||
    isAzureAgentsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    }) ||
    assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES

  if (hasStoredInstructions) {
    return {}
  }

  // For other storage providers (like SUPERINTERFACE_CLOUD or OPENAI_RESPONSES),
  // send empty string as they don't have stored instructions
  return {
    instructions: '',
  }
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
}) => {
  const runOpts = {
    stream: true,
    assistant_id: storageAssistantId({ assistant }),
    ...instructions({ assistant }),
    model: assistant.modelSlug,
    truncation_strategy: truncationStrategy({ assistant }),
    ...(await tools({ assistant, thread, prisma })),
  }

  return runOpts
}
