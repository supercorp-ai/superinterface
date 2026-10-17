import type { Thread, PrismaClient } from '@prisma/client'
import { flat } from 'radash'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { listMcpServerFunctionTools } from '@/lib/tools/tools/listMcpServerFunctionTools'
import { serializeResponsesMcpServerTool } from '@/lib/tools/tools/serializeResponsesMcpServerTool'
import type { AssistantWithMcpServers } from '@/lib/tools/tools/mcpServerToolsTypes'

export const mcpServerTools = async ({
  assistant,
  thread,
  prisma,
  useOpenaiComputerTool,
}: {
  assistant: AssistantWithMcpServers
  thread: Thread
  prisma: PrismaClient
  useOpenaiComputerTool: boolean
}) => {
  const mcpServers = assistant.mcpServers.filter(
    (mcpServer) => !mcpServer.computerUseTool,
  )
  const isResponsesStorage = isResponsesStorageProvider({
    storageProviderType: assistant.storageProviderType,
  })

  // Responses storage connects to MCP servers natively, unless the OpenAI
  // computer tool is used, in which case tools are listed as functions.
  if (isResponsesStorage && !useOpenaiComputerTool) {
    return mcpServers.map((mcpServer) =>
      serializeResponsesMcpServerTool({ mcpServer, thread, assistant, prisma }),
    )
  }

  const functionTools = await Promise.all(
    mcpServers.map((mcpServer) =>
      listMcpServerFunctionTools({ mcpServer, thread, assistant, prisma }),
    ),
  )

  return flat(functionTools)
}
