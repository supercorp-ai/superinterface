import type { PrismaClient } from '@prisma/client'
import { invalidIdsResponse } from '@/lib/misc/invalidIdsResponse'
import { authorizeOrganizationApiKey } from '@/lib/organizationApiKeys/authorizeOrganizationApiKey'

// Authorizes an organization api key request, validates the workspace id and
// scopes the workspace to the key's organization, or returns the error
// response to send.
export const authorizeWorkspaceRequest =
  ({ prisma }: { prisma: PrismaClient }) =>
  async ({ workspaceId }: { workspaceId: string }) => {
    const { organizationApiKey, errorResponse } =
      await authorizeOrganizationApiKey({ prisma })

    if (errorResponse) return { errorResponse }

    const idsErrorResponse = invalidIdsResponse({
      ids: [{ id: workspaceId, error: 'Invalid workspace id' }],
    })

    if (idsErrorResponse) return { errorResponse: idsErrorResponse }

    return {
      where: {
        id: workspaceId,
        organizationId: organizationApiKey.organizationId,
      },
    }
  }
