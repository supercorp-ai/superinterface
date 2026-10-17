import type { PrismaClient } from '@prisma/client'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'
import { normalizeMcpServerName } from '@/lib/mcpServers/normalizeMcpServerName'
import { isValidMcpServerLabel } from '@/lib/mcpServers/isValidMcpServerLabel'
import { invalidMcpServerNameResponse } from '@/lib/mcpServers/invalidMcpServerNameResponse'
import { mcpServerResponse } from '@/lib/mcpServers/mcpServerResponse'
import { noMcpServerFoundResponse } from '@/lib/mcpServers/noMcpServerFoundResponse'
import { authorizeMcpServerRequest } from './lib/authorizeMcpServerRequest'
import { updateMcpServerResponse } from './lib/updateMcpServerResponse'
import { deleteMcpServerResponse } from './lib/deleteMcpServerResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeMcpServerRequest({ prisma }),
    handle: async ({ where }) => {
      const mcpServer = await prisma.mcpServer.findFirst({
        where,
        include: {
          sseTransport: true,
          httpTransport: true,
        },
      })

      if (!mcpServer) {
        return noMcpServerFoundResponse()
      }

      return mcpServerResponse({ mcpServer })
    },
  })

export const buildPATCH = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeMcpServerRequest({ prisma }),
    handle: async ({
      request,
      params: { assistantId, mcpServerId },
      where,
    }) => {
      const parsed = mcpServerSchema.safeParse(await request.json())

      if (!parsed.success) {
        return invalidPayloadResponse()
      }

      const { name } = parsed.data

      // The name is validated before the server is looked up.
      const label =
        typeof name === 'string' ? normalizeMcpServerName(name) : undefined

      if (label !== undefined && !isValidMcpServerLabel({ label })) {
        return invalidMcpServerNameResponse()
      }

      return updateMcpServerResponse({
        prisma,
        where,
        assistantId,
        mcpServerId,
        label,
        body: parsed.data,
      })
    },
  })

export const buildDELETE = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeMcpServerRequest({ prisma }),
    handle: ({ params: { mcpServerId }, where }) =>
      deleteMcpServerResponse({ prisma, where, mcpServerId }),
  })

export const buildOPTIONS = () => corsOptionsResponse
