import type { PrismaClient } from '@prisma/client'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { apiKeyResponse } from '../lib/apiKeyResponse'
import { authorizeApiKeyRequest } from '../lib/authorizeApiKeyRequest'
import { deleteApiKeyResponse } from '../lib/deleteApiKeyResponse'
import { renameApiKeyResponse } from '../lib/renameApiKeyResponse'
import { withPublicApiKey } from '../lib/withPublicApiKey'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeApiKeyRequest({ prisma }),
    handle: ({ where }) =>
      withPublicApiKey({
        prisma,
        where,
        respond: (apiKey) => apiKeyResponse({ apiKey }),
      }),
  })

export const buildPATCH = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeApiKeyRequest({ prisma }),
    handle: ({ request, where }) =>
      renameApiKeyResponse({ prisma, request, where }),
  })

export const buildDELETE = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeApiKeyRequest({ prisma }),
    handle: ({ where }) => deleteApiKeyResponse({ prisma, where }),
  })

export const buildOPTIONS = () => corsOptionsResponse
