import type { PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { createApiKeyResponse } from './lib/createApiKeyResponse'
import { listApiKeysResponse } from './lib/listApiKeysResponse'

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async () => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return errorResponse

    return listApiKeysResponse({
      prisma,
      workspaceId: privateApiKey.workspaceId,
    })
  }

export const buildPOST =
  ({ prisma }: { prisma: PrismaClient }) =>
  (request: Request) =>
    createApiKeyResponse({ prisma, request })

export const buildOPTIONS = () => corsOptionsResponse
