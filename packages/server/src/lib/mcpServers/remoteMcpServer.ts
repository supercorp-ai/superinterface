import type { Prisma } from '@prisma/client'

// An MCP server with the transports it can be reached over remotely.
export type RemoteMcpServer = Prisma.McpServerGetPayload<{
  include: {
    httpTransport: true
    sseTransport: true
  }
}>
