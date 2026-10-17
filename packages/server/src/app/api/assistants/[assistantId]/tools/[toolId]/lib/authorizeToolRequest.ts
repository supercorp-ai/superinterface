import type { PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { invalidIdsResponse } from '@/lib/misc/invalidIdsResponse'
import { toolWhere } from '@/lib/tools/toolWhere'

// Authorizes a private api key request, validates the route ids and scopes
// the tool to the key's workspace, or returns the error response to send.
export const authorizeToolRequest =
  ({ prisma }: { prisma: PrismaClient }) =>
  async ({ assistantId, toolId }: { assistantId: string; toolId: string }) => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return { errorResponse }

    const idsErrorResponse = invalidIdsResponse({
      ids: [
        { id: assistantId, error: 'Invalid assistant id' },
        { id: toolId, error: 'Invalid tool id' },
      ],
    })

    if (idsErrorResponse) return { errorResponse: idsErrorResponse }

    return {
      where: toolWhere({
        toolId,
        assistantId,
        workspaceId: privateApiKey.workspaceId,
      }),
    }
  }
