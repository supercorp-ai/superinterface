import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getAuthorizationHeader } from '@/lib/apiKeys/getAuthorizationHeader'
import { getOrganizationApiKey } from '@/lib/organizationApiKeys/getOrganizationApiKey'

// Resolves the organization api key from the authorization header, or the
// error response to send when it is missing or invalid.
export const authorizeOrganizationApiKey = async ({
  prisma,
}: {
  prisma: PrismaClient
}) => {
  const authorization = await getAuthorizationHeader()

  if (!authorization) {
    return {
      errorResponse: NextResponse.json(
        { error: 'No authorization header found' },
        { status: 400 },
      ),
    }
  }

  const organizationApiKey = await getOrganizationApiKey({
    authorization,
    prisma,
  })

  if (!organizationApiKey) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Invalid organization api key' },
        { status: 400 },
      ),
    }
  }

  return { organizationApiKey }
}
