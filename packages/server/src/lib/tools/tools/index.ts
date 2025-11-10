import type { Prisma, Thread, PrismaClient } from '@prisma/client'
import {
  ToolType,
  ImageGenerationToolSize,
  ModelProviderType,
} from '@prisma/client'
import { flat } from 'radash'
import type OpenAI from 'openai'
import { modelProviderConfigs } from '@/lib/modelProviders/modelProviderConfigs'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { connectMcpServer } from '@/lib/mcpServers/connectMcpServer'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'
import { url } from '@/lib/mcpServers/url'
import { headers } from '@/lib/mcpServers/headers'
import { getMcpServerLabel } from '@/lib/mcpServers/getMcpServerLabel'

const serializeImageGenerationToolSize = ({
  tool,
}: {
  tool: Prisma.ToolGetPayload<{
    include: { imageGenerationTool: true }
  }>
}) => {
  if (tool.imageGenerationTool!.size === ImageGenerationToolSize.AUTO) {
    return 'auto'
  } else if (
    tool.imageGenerationTool!.size === ImageGenerationToolSize.SIZE_1024_1024
  ) {
    return '1024x1024'
  } else if (
    tool.imageGenerationTool!.size === ImageGenerationToolSize.SIZE_1024_1536
  ) {
    return '1024x1536'
  } else if (
    tool.imageGenerationTool!.size === ImageGenerationToolSize.SIZE_1536_1024
  ) {
    return '1536x1024'
  }
}

const nativeTools = ({
  assistant,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      modelProvider: true
      tools: {
        include: {
          fileSearchTool: true
          webSearchTool: true
          imageGenerationTool: true
          codeInterpreterTool: true
          computerUseTool: true
        }
      }
    }
  }>
}): OpenAI.Beta.Assistants.AssistantTool[] =>
  assistant.tools
    .map((tool) => {
      if (tool.type === ToolType.FILE_SEARCH) {
        if (
          isOpenaiAssistantsStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'file_search' as const,
          }
        }

        if (
          isAzureAgentsStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'file_search' as const,
          }
        }

        if (
          isResponsesStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'file_search' as const,
            file_search: {
              vector_store_ids: tool.fileSearchTool!.vectorStoreIds,
              max_num_results: tool.fileSearchTool!.maxNumResults,
            },
          }
        }

        return null
      } else if (tool.type === ToolType.CODE_INTERPRETER) {
        if (
          isOpenaiAssistantsStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'code_interpreter' as const,
          }
        }

        if (
          isAzureAgentsStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'code_interpreter' as const,
          }
        }

        if (
          isResponsesStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'code_interpreter' as const,
            code_interpreter: {
              container: {
                type: 'auto' as const,
              },
            },
          }
        }

        if (assistant.modelProvider.type === ModelProviderType.ANTHROPIC) {
          return {
            type: 'code_execution_20250825' as const,
            code_execution_20250825: {
              name: 'code_execution',
            },
          }
        }

        return null
      } else if (tool.type === ToolType.IMAGE_GENERATION) {
        if (
          isResponsesStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'image_generation' as const,
            image_generation: {
              model: tool.imageGenerationTool!.model,
              background: tool.imageGenerationTool!.background.toLowerCase() as
                | 'transparent'
                | 'opaque'
                | 'auto',
              quality: tool.imageGenerationTool!.quality.toLowerCase() as
                | 'auto'
                | 'low'
                | 'medium'
                | 'high',
              output_format:
                tool.imageGenerationTool!.outputFormat.toLowerCase() as
                  | 'png'
                  | 'jpeg'
                  | 'webp',
              size: serializeImageGenerationToolSize({ tool }),
              partial_images: tool.imageGenerationTool!.partialImages,
            },
          }
        }

        return null
      } else if (tool.type === ToolType.WEB_SEARCH) {
        if (
          isResponsesStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'web_search' as const,
          }
        }

        if (assistant.modelProvider.type === ModelProviderType.ANTHROPIC) {
          return {
            type: 'web_search_20250305' as const,
            web_search_20250305: {
              name: 'web_search',
            },
          }
        }

        return null
      } else if (tool.type === ToolType.COMPUTER_USE) {
        if (!tool.computerUseTool!.mcpServerId) {
          return null
        }

        if (
          isResponsesStorageProvider({
            storageProviderType: assistant.storageProviderType,
          })
        ) {
          return {
            type: 'computer_use_preview',
            computer_use_preview: {
              environment: tool.computerUseTool!.environment.toLowerCase(),
              display_width: tool.computerUseTool!.displayWidth,
              display_height: tool.computerUseTool!.displayHeight,
            },
          }
        }

        if (assistant.modelProvider.type === ModelProviderType.ANTHROPIC) {
          return {
            type: 'computer_20250124' as const,
            computer_20250124: {
              name: 'computer',
              display_width_px: tool.computerUseTool!.displayWidth,
              display_height_px: tool.computerUseTool!.displayHeight,
            },
          }
        }

        return null
      }

      return null
    })
    .filter(Boolean) as OpenAI.Beta.Assistants.AssistantTool[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeTool = ({ tool }: { tool: any }) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.inputSchema,
})

const mcpServerToolsAsFunction = ({
  mcpServers,
  thread,
  assistant,
  prisma,
}: {
  mcpServers: Prisma.McpServerGetPayload<{
    include: {
      stdioTransport: true
      httpTransport: true
      sseTransport: true
      computerUseTool: true
    }
  }>[]
  thread: Thread
  assistant: Prisma.AssistantGetPayload<{
    include: {
      mcpServers: {
        include: {
          stdioTransport: true
          httpTransport: true
          sseTransport: true
          computerUseTool: true
        }
      }
    }
  }>
  prisma: PrismaClient
}) =>
  Promise.all(
    mcpServers.map(async (mcpServer) => {
      const { mcpConnection } = await connectMcpServer({
        mcpServer,
        thread,
        assistant,
        prisma,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listToolsResponse = (await mcpConnection.client.listTools()) as any

      await closeMcpConnection({
        mcpConnection,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return listToolsResponse.tools.map((tool: any) => ({
        type: 'function',
        function: serializeTool({ tool }),
      })) as OpenAI.Beta.Assistants.AssistantTool[]
    }),
  )

const mcpServerTools = async ({
  assistant,
  thread,
  prisma,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      mcpServers: {
        include: {
          stdioTransport: true
          httpTransport: true
          sseTransport: true
          computerUseTool: true
        }
      }
    }
  }>
  thread: Thread
  prisma: PrismaClient
}) => {
  const nonComputerUseMcpServers = assistant.mcpServers.filter(
    (mcpServer) => !mcpServer.computerUseTool,
  )

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    }) &&
    !assistant.modelSlug.match('computer-use')
  ) {
    return nonComputerUseMcpServers.map((mcpServer) => {
      const serverLabel = getMcpServerLabel({
        id: mcpServer.id,
        name: mcpServer.name,
      })

      return {
        type: 'mcp',
        mcp: {
          server_label: serverLabel,
          ...(mcpServer.description
            ? { server_description: mcpServer.description }
            : {}),
          server_url: url({ thread, mcpServer, assistant, prisma }),
          headers: headers({ thread, mcpServer, assistant, prisma }),
          require_approval: 'never',
        },
      }
    })
  }

  const result = await mcpServerToolsAsFunction({
    mcpServers: nonComputerUseMcpServers,
    thread,
    assistant,
    prisma,
  })

  return flat(result)
}

export const tools = async ({
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
  const modelProviderConfig = modelProviderConfigs.find(
    (config) => config.type === assistant.modelProvider.type,
  )

  if (!modelProviderConfig) return {}
  if (!modelProviderConfig.isFunctionCallingAvailable) {
    return {}
  }

  return {
    tools: [
      ...(await mcpServerTools({ assistant, thread, prisma })),
      ...assistant.functions.map((fn) => ({
        type: 'function' as const,
        function: fn.openapiSpec as unknown as OpenAI.FunctionDefinition,
      })),
      ...nativeTools({ assistant }),
    ] as OpenAI.Beta.Assistants.AssistantTool[],
  }
}
