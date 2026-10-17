import type { PrismaClient } from '@prisma/client'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { providerResponse } from '@/lib/modelProviders/providerResponse'
import { authorizeProviderRequest } from '../lib/authorizeProviderRequest'
import { deleteProviderResponse } from '../lib/deleteProviderResponse'
import { updateProviderResponse } from '../lib/updateProviderResponse'
import { withProvider } from '../lib/withProvider'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeProviderRequest({ prisma }),
    handle: ({ where }) =>
      withProvider({
        prisma,
        where,
        respond: (provider) => providerResponse({ provider }),
      }),
  })

export const buildPATCH = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeProviderRequest({ prisma }),
    handle: ({ request, where }) =>
      updateProviderResponse({ prisma, request, where }),
  })

export const buildDELETE = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeProviderRequest({ prisma }),
    handle: ({ where }) => deleteProviderResponse({ prisma, where }),
  })

export const buildOPTIONS = () => corsOptionsResponse
