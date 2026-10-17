import type { PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { invalidIdsResponse } from '@/lib/misc/invalidIdsResponse'
import { functionWhere } from '@/lib/functions/functionWhere'

// Authorizes a private api key request, validates the route ids and scopes
// the function to the key's workspace, or returns the error response to send.
export const authorizeFunctionRequest =
  ({ prisma }: { prisma: PrismaClient }) =>
  async ({
    assistantId,
    functionId,
  }: {
    assistantId: string
    functionId: string
  }) => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return { errorResponse }

    const idsErrorResponse = invalidIdsResponse({
      ids: [
        { id: assistantId, error: 'Invalid assistant id' },
        { id: functionId, error: 'Invalid function id' },
      ],
    })

    if (idsErrorResponse) return { errorResponse: idsErrorResponse }

    return {
      where: functionWhere({
        functionId,
        assistantId,
        workspaceId: privateApiKey.workspaceId,
      }),
    }
  }
