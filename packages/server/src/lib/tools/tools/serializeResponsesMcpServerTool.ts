import type { Thread, PrismaClient } from '@prisma/client'
import { url } from '@/lib/mcpServers/url'
import { headers } from '@/lib/mcpServers/headers'
import { getMcpServerLabel } from '@/lib/mcpServers/getMcpServerLabel'
import type {
  AssistantWithMcpServers,
  McpServerWithTransports,
} from '@/lib/tools/tools/mcpServerToolsTypes'

export const serializeResponsesMcpServerTool = ({
  mcpServer,
  thread,
  assistant,
  prisma,
}: {
  mcpServer: McpServerWithTransports
  thread: Thread
  assistant: AssistantWithMcpServers
  prisma: PrismaClient
}) => ({
  type: 'mcp',
  mcp: {
    server_label: getMcpServerLabel({
      id: mcpServer.id,
      name: mcpServer.name,
    }),
    ...(mcpServer.description
      ? { server_description: mcpServer.description }
      : {}),
    server_url: url({ thread, mcpServer, assistant, prisma }),
    headers: headers({ thread, mcpServer, assistant, prisma }),
    require_approval: 'never',
  },
})
