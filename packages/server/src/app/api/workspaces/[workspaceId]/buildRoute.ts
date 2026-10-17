import type { PrismaClient } from '@prisma/client'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { workspaceResponse } from '@/lib/workspaces/workspaceResponse'
import { authorizeWorkspaceRequest } from '../lib/authorizeWorkspaceRequest'
import { updateWorkspaceResponse } from '../lib/updateWorkspaceResponse'
import { withWorkspace } from '../lib/withWorkspace'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeWorkspaceRequest({ prisma }),
    handle: ({ where }) =>
      withWorkspace({
        prisma,
        where,
        respond: (workspace) => workspaceResponse({ workspace }),
      }),
  })

export const buildPATCH = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeWorkspaceRequest({ prisma }),
    handle: ({ request, where }) =>
      updateWorkspaceResponse({ prisma, request, where }),
  })

export const buildOPTIONS = () => corsOptionsResponse
