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
  azureAgentsStorageAdapter,
  azureAgentsRunAdapter,
} from 'supercompat'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'
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

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return responsesStorageAdapter()
  }

  if (
    isAzureAgentsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    const azureAiProject = getAzureAiProjectClient({
      modelProvider: assistant.modelProvider,
    })
    return azureAgentsStorageAdapter({ azureAiProject, prisma })
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

  if (
    isAzureAgentsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    const azureAiProject = getAzureAiProjectClient({
      modelProvider: assistant.modelProvider,
    })
    return azureAgentsRunAdapter({ azureAiProject })
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
}): OpenAI => {
  let client

  if (
    assistant.storageProviderType === StorageProviderType.AZURE_AGENTS_RESPONSES
  ) {
    const azureAiProject = getAzureAiProjectClient({
      modelProvider: assistant.modelProvider,
    })

    client = {
      responses: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async (...args: any[]) => {
          const openAIClient = await azureAiProject.getOpenAIClient()
          const params = args[0]
          if (params.agent) {
            delete params.model
          }
          return openAIClient.responses.create(...args)
        },
      },
      beta: {
        threads: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: async (...args: any[]) => {
            const openAIClient = await azureAiProject.getOpenAIClient()
            return openAIClient.conversations.create(...args)
          },
          messages: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: async (threadId: string, ...args: any[]) => {
              const openAIClient = await azureAiProject.getOpenAIClient()
              return openAIClient.conversations.messages.create(
                threadId,
                ...args,
              )
            },
          },
          runs: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: async (threadId: string, body: any, ...args: any[]) => {
              const openAIClient = await azureAiProject.getOpenAIClient()
              const { agent, ...rest } = body
              return openAIClient.responses.create(
                { conversation: threadId },
                {
                  body: {
                    agent: {
                      name:
                        agent?.name ??
                        assistant.azureAgentsAgentId ??
                        assistant.name,
                      type: 'agent_reference',
                    },
                    ...rest,
                  },
                },
              )
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stream: async (threadId: string, body: any, ...args: any[]) => {
              const openAIClient = await azureAiProject.getOpenAIClient()
              const { agent, ...rest } = body
              return openAIClient.responses.create(
                { conversation: threadId },
                {
                  body: {
                    stream: true,
                    agent: {
                      name:
                        agent?.name ??
                        assistant.azureAgentsAgentId ??
                        assistant.name,
                      type: 'agent_reference',
                    },
                    ...rest,
                  },
                },
              )
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cancel: async (...args: any[]) => {
              const openAIClient = await azureAiProject.getOpenAIClient()
              // @ts-expect-error - lazy
              return openAIClient.beta.threads.runs.cancel(...args)
            },
          },
        },
      },
    }
  } else {
    client = clientAdapter({
      modelProvider: assistant.modelProvider,
    })
  }

  return supercompat({
    client,
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
}
