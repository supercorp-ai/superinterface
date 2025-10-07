import type { Prisma, Thread } from '@prisma/client'
import {
  TransportType,
  ToolType,
  ImageGenerationToolSize,
} from '@prisma/client'
import { flat } from 'radash'
import { map } from 'p-iteration'
import type OpenAI from 'openai'
import { modelProviderConfigs } from '@/lib/modelProviders/modelProviderConfigs'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { connectMcpServer } from '@/lib/mcpServers/connectMcpServer'
import type { ModelProviderConfig } from '@/types'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { url } from '@/lib/mcpServers/url'
import { headers } from '@/lib/mcpServers/headers'

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
  modelProviderConfig: ModelProviderConfig
}): OpenAI.Beta.Assistants.AssistantTool[] => {
  if (
    !isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    }) &&
    !isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return []
  }

  return assistant.tools
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

        return {
          type: 'file_search' as const,
          file_search: {
            vector_store_ids: tool.fileSearchTool!.vectorStoreIds,
            max_num_results: tool.fileSearchTool!.maxNumResults,
          },
        }
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

        return {
          type: 'code_interpreter' as const,
          code_interpreter: {
            container: {
              type: 'auto' as const,
            },
          },
        }
      } else if (tool.type === ToolType.IMAGE_GENERATION) {
        return {
          type: 'image_generation' as const,
          image_generation: {
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
      } else if (tool.type === ToolType.WEB_SEARCH) {
        return {
          type: 'web_search' as const,
        }
      } else if (tool.type === ToolType.COMPUTER_USE) {
        if (!tool.computerUseTool!.mcpServerId) {
          return null
        }

        return {
          type: 'computer_use_preview',
          computer_use_preview: {
            environment: tool.computerUseTool!.environment.toLowerCase(),
            display_width: tool.computerUseTool!.displayWidth,
            display_height: tool.computerUseTool!.displayHeight,
          },
        }
      }

      return null
    })
    .filter(Boolean) as OpenAI.Beta.Assistants.AssistantTool[]
}

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
}) =>
  map(mcpServers, async (mcpServer) => {
    const { mcpConnection } = await connectMcpServer({
      mcpServer,
      thread,
      assistant,
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
  })

const mcpServerTools = async ({
  assistant,
  thread,
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
}) => {
  const nonComputerUseMcpServers = assistant.mcpServers.filter(
    (mcpServer) => !mcpServer.computerUseTool,
  )

  if (
    isResponsesStorageProvider({
      storageProviderType: assistant.storageProviderType,
    }) &&
    assistant.modelSlug.match('computer-use')
  ) {
    const httpMcpServers = nonComputerUseMcpServers.filter(
      (mcpServer) => mcpServer.transportType === TransportType.HTTP,
    )

    const nativeMcpServerTools = httpMcpServers.map((mcpServer) => ({
      type: 'mcp',
      mcp: {
        server_label: `mcp-server-${mcpServer.id}`,
        server_url: url({ thread, mcpServer, assistant }),
        headers: headers({ thread, mcpServer, assistant }),
        require_approval: 'never',
      },
    }))

    return [
      ...nativeMcpServerTools,
      ...(await mcpServerToolsAsFunction({
        mcpServers: nonComputerUseMcpServers,
        thread,
        assistant,
      })),
    ]
  }

  const result = await mcpServerToolsAsFunction({
    mcpServers: nonComputerUseMcpServers,
    thread,
    assistant,
  })

  return flat(result)
}

export const tools = async ({
  assistant,
  thread,
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
      ...(await mcpServerTools({ assistant, thread })),
      ...assistant.functions.map((fn) => ({
        type: 'function' as const,
        function: fn.openapiSpec as unknown as OpenAI.FunctionDefinition,
      })),
      ...nativeTools({ assistant, modelProviderConfig }),
    ] as OpenAI.Beta.Assistants.AssistantTool[],
  }
}
