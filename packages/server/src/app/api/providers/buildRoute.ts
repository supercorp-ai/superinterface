import type { PrismaClient } from '@prisma/client'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { createProviderResponse } from './lib/createProviderResponse'
import { listProvidersResponse } from './lib/listProvidersResponse'
import { privateApiKeyHandler } from './lib/privateApiKeyHandler'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  privateApiKeyHandler({
    prisma,
    handle: ({ workspaceId }) => listProvidersResponse({ prisma, workspaceId }),
  })

export const buildPOST = ({ prisma }: { prisma: PrismaClient }) =>
  privateApiKeyHandler({
    prisma,
    handle: ({ request, workspaceId }) =>
      createProviderResponse({ prisma, request, workspaceId }),
  })

export const buildOPTIONS = () => corsOptionsResponse
