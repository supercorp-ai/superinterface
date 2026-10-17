import type { Prisma, PrismaClient } from '@prisma/client'
import { mcpServerResponse } from '@/lib/mcpServers/mcpServerResponse'
import { noMcpServerFoundResponse } from '@/lib/mcpServers/noMcpServerFoundResponse'

// `where` comes from authorizeMcpServerRequest, so only servers of the api
// key's workspace are found and deleted.
export const deleteMcpServerResponse = async ({
  prisma,
  where,
  mcpServerId,
}: {
  prisma: PrismaClient
  where: Prisma.McpServerWhereInput
  mcpServerId: string
}) => {
  const mcpServer = await prisma.mcpServer.findFirst({ where })

  if (!mcpServer) {
    return noMcpServerFoundResponse()
  }

  const deletedMcpServer = await prisma.mcpServer.delete({
    where: { id: mcpServerId },
    include: {
      sseTransport: true,
      httpTransport: true,
    },
  })

  return mcpServerResponse({ mcpServer: deletedMcpServer })
}
