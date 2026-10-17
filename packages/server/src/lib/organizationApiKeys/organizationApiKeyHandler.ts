import type { OrganizationApiKey, PrismaClient } from '@prisma/client'
import type { NextRequest, NextResponse } from 'next/server'
import { authorizeOrganizationApiKey } from '@/lib/organizationApiKeys/authorizeOrganizationApiKey'

// Builds a route handler that authorizes the organization api key first,
// answering with the authorization's error response when it fails and
// handing the key to the handler otherwise.
export const organizationApiKeyHandler =
  ({
    prisma,
    handle,
  }: {
    prisma: PrismaClient
    handle: (args: {
      request: NextRequest
      organizationApiKey: OrganizationApiKey
    }) => Promise<NextResponse>
  }) =>
  async (request: NextRequest) => {
    const { organizationApiKey, errorResponse } =
      await authorizeOrganizationApiKey({ prisma })

    if (errorResponse) return errorResponse

    return handle({ request, organizationApiKey })
  }
