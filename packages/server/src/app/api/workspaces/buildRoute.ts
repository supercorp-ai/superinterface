import type { PrismaClient } from '@prisma/client'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { organizationApiKeyHandler } from '@/lib/organizationApiKeys/organizationApiKeyHandler'
import { createDefaultWorkspace } from './lib/createDefaultWorkspace'
import type { CreateWorkspace } from './lib/CreateWorkspace'
import { createWorkspaceResponse } from './lib/createWorkspaceResponse'
import { createWorkspaceSchema } from './lib/createWorkspaceSchema'
import { listWorkspacesResponse } from './lib/listWorkspacesResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  organizationApiKeyHandler({
    prisma,
    handle: ({ organizationApiKey }) =>
      listWorkspacesResponse({
        prisma,
        organizationId: organizationApiKey.organizationId,
      }),
  })

export const buildPOST = ({
  prisma,
  createWorkspace = createDefaultWorkspace,
}: {
  prisma: PrismaClient
  createWorkspace?: CreateWorkspace
}) =>
  organizationApiKeyHandler({
    prisma,
    handle: ({ request, organizationApiKey }) =>
      createWorkspaceResponse({
        prisma,
        createWorkspace,
        request,
        organizationApiKey,
      }),
  })

export const buildOPTIONS = () => corsOptionsResponse

export { createWorkspaceSchema }
