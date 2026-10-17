import type { PrismaClient } from '@prisma/client'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { authorizeAssistantRequest } from '@/lib/assistants/authorizeAssistantRequest'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'
import { listMcpServersResponse } from './lib/listMcpServersResponse'
import { createMcpServerResponse } from './lib/createMcpServerResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: ({ where }) => listMcpServersResponse({ prisma, where }),
  })

export const buildPOST = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: async ({ request, params: { assistantId }, where }) => {
      const parsed = mcpServerSchema.safeParse(await request.json())

      if (!parsed.success) {
        return invalidPayloadResponse()
      }

      return createMcpServerResponse({
        prisma,
        where,
        assistantId,
        body: parsed.data,
      })
    },
  })

export const buildOPTIONS = () => corsOptionsResponse
