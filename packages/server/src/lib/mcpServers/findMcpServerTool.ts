import type { Assistant, Prisma, Thread, PrismaClient } from '@prisma/client'
import type { McpConnection } from '@/types'
import { connectMcpServer } from './connectMcpServer'
import { closeMcpConnection } from './closeMcpConnection'
import { hasMcpTool } from './hasMcpTool'

type McpServer = Prisma.McpServerGetPayload<{
  include: {
    stdioTransport: true
    httpTransport: true
    sseTransport: true
  }
}>

// What looking for a tool on one MCP server turned up. A found tool keeps
// its server connection open for the call.
export type McpServerToolLookup =
  | { outcome: 'found'; mcpConnection: McpConnection }
  | { outcome: 'missing' }
  | { outcome: 'failed'; error: Error }

// Connects to the MCP server and keeps the connection only when the server
// has the tool.
export const findMcpServerTool = async ({
  mcpServer,
  toolName,
  thread,
  assistant,
  prisma,
}: {
  mcpServer: McpServer
  toolName: string
  thread: Thread
  assistant: Assistant
  prisma: PrismaClient
}): Promise<McpServerToolLookup> => {
  let mcpConnection: McpConnection | undefined

  try {
    ;({ mcpConnection } = await connectMcpServer({
      mcpServer,
      thread,
      assistant,
      prisma,
    }))

    if (await hasMcpTool({ mcpConnection, toolName })) {
      return { outcome: 'found', mcpConnection }
    }

    await closeMcpConnection({ mcpConnection })

    return { outcome: 'missing' }
  } catch (e) {
    if (mcpConnection) {
      // Closing the MCP SDK HTTP/SSE transports does not throw.
      await closeMcpConnection({ mcpConnection })
    }

    // MCP SDK, transport and URL/header failures are all Error instances.
    return { outcome: 'failed', error: e as Error }
  }
}
