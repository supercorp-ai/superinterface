import type { Thread, PrismaClient } from '@prisma/client'
import { connectMcpServer } from '@/lib/mcpServers/connectMcpServer'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'
import { serializeMcpFunctionTool } from '@/lib/tools/tools/serializeMcpFunctionTool'
import type {
  AssistantWithMcpServers,
  McpServerWithTransports,
} from '@/lib/tools/tools/mcpServerToolsTypes'

export const listMcpServerFunctionTools = async ({
  mcpServer,
  thread,
  assistant,
  prisma,
}: {
  mcpServer: McpServerWithTransports
  thread: Thread
  assistant: AssistantWithMcpServers
  prisma: PrismaClient
}) => {
  const { mcpConnection } = await connectMcpServer({
    mcpServer,
    thread,
    assistant,
    prisma,
  })
  const { client } = mcpConnection
  const { tools } = await client.listTools()

  await closeMcpConnection({
    mcpConnection,
  })

  return tools.map((tool) => serializeMcpFunctionTool({ tool }))
}
