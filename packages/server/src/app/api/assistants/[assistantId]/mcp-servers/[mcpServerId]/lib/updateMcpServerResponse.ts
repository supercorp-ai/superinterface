import type { Prisma, PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import type { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'
import { isMcpServerLabelTaken } from '@/lib/mcpServers/isMcpServerLabelTaken'
import { mcpServerNameTakenResponse } from '@/lib/mcpServers/mcpServerNameTakenResponse'
import { mcpServerData } from '@/lib/mcpServers/mcpServerData'
import { mcpServerResponse } from '@/lib/mcpServers/mcpServerResponse'
import { noMcpServerFoundResponse } from '@/lib/mcpServers/noMcpServerFoundResponse'

// Updates the MCP server after checking that it exists and that its new
// label, if any, is not used by another server of the assistant. `where`
// comes from authorizeMcpServerRequest, so only servers of the api key's
// workspace are found.
export const updateMcpServerResponse = async ({
  prisma,
  where,
  assistantId,
  mcpServerId,
  label,
  body,
}: {
  prisma: PrismaClient
  where: Prisma.McpServerWhereInput
  assistantId: string
  mcpServerId: string
  label: string | undefined
  body: z.infer<typeof mcpServerSchema>
}) => {
  const mcpServer = await prisma.mcpServer.findFirst({ where })

  if (!mcpServer) {
    return noMcpServerFoundResponse()
  }

  const isLabelTaken = label
    ? await isMcpServerLabelTaken({
        prisma,
        assistantId,
        label,
        excludeMcpServerId: mcpServerId,
      })
    : false

  if (isLabelTaken) {
    return mcpServerNameTakenResponse()
  }

  // Known limitation: switching the transport type issues a nested update
  // for a transport that does not exist yet, which Prisma rejects.
  const updatedMcpServer = await prisma.mcpServer.update({
    where: {
      id: mcpServerId,
    },
    data: mcpServerData({ body, operation: 'update' }),
    include: {
      sseTransport: true,
      httpTransport: true,
    },
  })

  return mcpServerResponse({ mcpServer: updatedMcpServer })
}
