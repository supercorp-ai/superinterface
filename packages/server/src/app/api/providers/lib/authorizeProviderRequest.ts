import type { PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { invalidIdsResponse } from '@/lib/misc/invalidIdsResponse'

// Authorizes a private api key request, validates the provider id and scopes
// the provider to the key's workspace, or returns the error response to send.
export const authorizeProviderRequest =
  ({ prisma }: { prisma: PrismaClient }) =>
  async ({ modelProviderId }: { modelProviderId: string }) => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return { errorResponse }

    const idsErrorResponse = invalidIdsResponse({
      ids: [{ id: modelProviderId, error: 'Invalid provider id' }],
    })

    if (idsErrorResponse) return { errorResponse: idsErrorResponse }

    return {
      where: { id: modelProviderId, workspaceId: privateApiKey.workspaceId },
    }
  }
