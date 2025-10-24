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
  responsesRunAdapter,
  responsesStorageAdapter,
} from 'supercompat'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { clientAdapter } from '@/lib/modelProviders/clientAdapter'
import { buildGetOpenaiAssistant } from './buildGetOpenaiAssistant'
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

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return responsesStorageAdapter()
  }

  throw new Error(
    `Invalid storage provider type: ${assistant.storageProviderType}`,
  )
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
    return responsesRunAdapter({
      getOpenaiAssistant: buildGetOpenaiAssistant({
        assistant,
        thread,
        prisma,
      }),
      waitUntil,
    })
  }

  throw new Error(
    `Invalid storage provider type: ${assistant.storageProviderType}`,
  )
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
    client: clientAdapter({
      modelProvider: assistant.modelProvider,
    }),
    // @ts-expect-error - storageAdapter can return undefined
    storage: storageAdapter({
      assistant,
      prisma,
    }),
    // @ts-expect-error - storageAdapter can return undefined
    runAdapter: runAdapter({
      assistant,
      thread,
      prisma,
    }),
  }) as unknown as OpenAI
