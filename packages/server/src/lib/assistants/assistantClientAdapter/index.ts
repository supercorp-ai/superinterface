import type { OpenAI } from 'openai'
import {
  PrismaClient,
  Prisma,
  StorageProviderType,
  Thread,
} from '@prisma/client'
import {
  supercompat,
  prismaStorageAdapter,
  completionsRunAdapter,
  openaiResponsesRunAdapter,
  openaiResponsesStorageAdapter,
  azureResponsesStorageAdapter,
  azureAgentsStorageAdapter,
  azureAgentsRunAdapter,
} from 'supercompat/openai'
import { AIProjectClient as AIProjectClientV1 } from '@azure/ai-projects'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { clientAdapter } from '@/lib/modelProviders/clientAdapter'
import { buildGetOpenaiAssistant } from './buildGetOpenaiAssistant'
import { getAzureAiProjectClient } from '@/lib/modelProviders/getAzureAiProjectClient'
import { waitUntil } from '@vercel/functions'

type AssistantWithModelProvider = Prisma.AssistantGetPayload<{
  include: { modelProvider: true }
}>

const storageAdapter = ({
  assistant,
  prisma,
}: {
  assistant: AssistantWithModelProvider
  prisma: PrismaClient
}) => {
  if (
    assistant.storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD
  ) {
    return prismaStorageAdapter({
      prisma,
    })
  }

  if (
    isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return undefined
  }

  if (assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES) {
    return azureResponsesStorageAdapter()
  }

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return openaiResponsesStorageAdapter({ deferItemCreationUntilRun: true })
  }

  // The only remaining storage provider type is Azure Agents.
  const azureAiProject = getAzureAiProjectClient({
    modelProvider: assistant.modelProvider,
    storageProviderType: assistant.storageProviderType,
  })
  return azureAgentsStorageAdapter({
    azureAiProject: azureAiProject as AIProjectClientV1,
    prisma,
  })
}

const runAdapter = ({
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
  thread: Thread | null
  prisma: PrismaClient
}) => {
  if (
    assistant.storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD
  ) {
    return completionsRunAdapter()
  }

  if (
    isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return undefined
  }

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return openaiResponsesRunAdapter({
      getOpenaiAssistant: buildGetOpenaiAssistant({
        assistant,
        thread,
        prisma,
      }),
      waitUntil,
    })
  }

  // The only remaining storage provider type is Azure Agents.
  const azureAiProject = getAzureAiProjectClient({
    modelProvider: assistant.modelProvider,
    storageProviderType: assistant.storageProviderType,
  })
  return azureAgentsRunAdapter({
    azureAiProject: azureAiProject as AIProjectClientV1,
  })
}

export const assistantClientAdapter = ({
  assistant,
  prisma,
  thread = null,
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
  prisma: PrismaClient
  thread?: Thread | null
}): OpenAI =>
  supercompat({
    clientAdapter: clientAdapter({
      modelProvider: assistant.modelProvider,
      storageProviderType: assistant.storageProviderType,
    }),
    // @ts-expect-error - storageAdapter can return undefined
    storageAdapter: storageAdapter({
      assistant,
      prisma,
    }),
    // @ts-expect-error - runAdapter can return undefined
    runAdapter: runAdapter({
      assistant,
      thread,
      prisma,
    }),
  }) as unknown as OpenAI
