import type { Prisma } from '@prisma/client'

type McpServerInclude = {
  stdioTransport: true
  httpTransport: true
  sseTransport: true
  computerUseTool: true
}

export type McpServerWithTransports = Prisma.McpServerGetPayload<{
  include: McpServerInclude
}>

export type AssistantWithMcpServers = Prisma.AssistantGetPayload<{
  include: {
    mcpServers: {
      include: McpServerInclude
    }
  }
}>
