import type { PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { invalidIdsResponse } from '@/lib/misc/invalidIdsResponse'
import { mcpServerWhere } from '@/lib/mcpServers/mcpServerWhere'

// Authorizes a private api key request, validates the route ids and scopes
// the MCP server to the key's workspace, or returns the error response to
// send.
export const authorizeMcpServerRequest =
  ({ prisma }: { prisma: PrismaClient }) =>
  async ({
    assistantId,
    mcpServerId,
  }: {
    assistantId: string
    mcpServerId: string
  }) => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return { errorResponse }

    const idsErrorResponse = invalidIdsResponse({
      ids: [
        { id: assistantId, error: 'Invalid assistant id' },
        { id: mcpServerId, error: 'Invalid MCP server id' },
      ],
    })

    if (idsErrorResponse) return { errorResponse: idsErrorResponse }

    return {
      where: mcpServerWhere({
        mcpServerId,
        assistantId,
        workspaceId: privateApiKey.workspaceId,
      }),
    }
  }
