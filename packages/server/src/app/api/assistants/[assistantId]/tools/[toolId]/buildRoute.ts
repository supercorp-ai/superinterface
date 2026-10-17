import type { PrismaClient } from '@prisma/client'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { toolInclude } from '@/lib/tools/serializeApiTool'
import { updateToolSchema } from '@/lib/tools/toolSchema'
import { toolResponse } from '@/lib/tools/toolResponse'
import { noToolFoundResponse } from '@/lib/tools/noToolFoundResponse'
import { authorizeToolRequest } from './lib/authorizeToolRequest'
import { updateToolResponse } from './lib/updateToolResponse'
import { deleteToolResponse } from './lib/deleteToolResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeToolRequest({ prisma }),
    handle: async ({ where }) => {
      const tool = await prisma.tool.findFirst({ where, include: toolInclude })

      if (!tool) {
        return noToolFoundResponse()
      }

      return toolResponse({ tool })
    },
  })

export const buildPATCH = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeToolRequest({ prisma }),
    handle: async ({ request, where }) => {
      const parsed = updateToolSchema.safeParse(await request.json())

      if (!parsed.success) {
        return invalidPayloadResponse()
      }

      return updateToolResponse({ prisma, where, body: parsed.data })
    },
  })

export const buildDELETE = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeToolRequest({ prisma }),
    handle: ({ where }) => deleteToolResponse({ prisma, where }),
  })

export const buildOPTIONS = () => corsOptionsResponse
