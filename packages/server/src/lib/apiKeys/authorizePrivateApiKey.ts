import { NextResponse } from 'next/server'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { getAuthorizationHeader } from '@/lib/apiKeys/getAuthorizationHeader'
import { invalidApiKeyResponse } from '@/lib/apiKeys/invalidApiKeyResponse'

// Resolves the private api key from the authorization header, or the error
// response to send when it is missing or invalid.
export const authorizePrivateApiKey = async ({
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

  const privateApiKey = await getApiKey({
    authorization,
    type: ApiKeyType.PRIVATE,
    prisma,
  })

  if (!privateApiKey) {
    return { errorResponse: invalidApiKeyResponse() }
  }

  return { privateApiKey }
}
