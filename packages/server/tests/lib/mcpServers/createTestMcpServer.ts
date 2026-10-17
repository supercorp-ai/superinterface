import { Prisma, TransportType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const transportData = ({
  transportType,
  url,
  headers,
}: {
  transportType: TransportType
  url: string
  headers: Record<string, string>
}) => {
  const transport = { create: { url, headers } }
  if (transportType === TransportType.HTTP) return { httpTransport: transport }
  if (transportType === TransportType.SSE) return { sseTransport: transport }
  return {}
}

// Registers an MCP server on an assistant with an HTTP or SSE transport.
export const createTestMcpServer = async ({
  assistantId,
  transportType,
  url,
  headers = {},
  name,
  description,
}: {
  assistantId: string
  transportType: TransportType
  url: string
  headers?: Record<string, string>
  name?: string
  description?: string
}) => {
  const data: Prisma.McpServerUncheckedCreateInput = {
    assistantId,
    transportType,
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    ...transportData({ transportType, url, headers }),
  }

  return prisma.mcpServer.create({ data })
}
