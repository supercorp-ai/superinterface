import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { invalidIdsResponse } from '@/lib/misc/invalidIdsResponse'
import type { PublicApiKeyWhere } from './PublicApiKeyWhere'

// Authorizes a private api key request, validates the api key id and scopes
// the public api key to the private key's workspace, or returns the error
// response to send.
export const authorizeApiKeyRequest =
  ({ prisma }: { prisma: PrismaClient }) =>
  async ({ apiKeyId }: { apiKeyId: string }) => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return { errorResponse }

    const idsErrorResponse = invalidIdsResponse({
      ids: [{ id: apiKeyId, error: 'Invalid api key id' }],
    })

    if (idsErrorResponse) return { errorResponse: idsErrorResponse }

    const where: PublicApiKeyWhere = {
      id: apiKeyId,
      type: ApiKeyType.PUBLIC,
      workspaceId: privateApiKey.workspaceId,
    }

    return { where }
  }
