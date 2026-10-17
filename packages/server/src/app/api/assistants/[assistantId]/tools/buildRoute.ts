import type { PrismaClient } from '@prisma/client'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { authorizeAssistantRequest } from '@/lib/assistants/authorizeAssistantRequest'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { toolSchema } from '@/lib/tools/toolSchema'
import { listToolsResponse } from './lib/listToolsResponse'
import { createToolResponse } from './lib/createToolResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: ({ where }) => listToolsResponse({ prisma, where }),
  })

export const buildPOST = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: async ({ request, where }) => {
      const assistant = await prisma.assistant.findFirst({
        where,
        include: {
          modelProvider: true,
        },
      })

      if (!assistant) {
        return noAssistantFoundResponse()
      }

      const parsed = toolSchema.safeParse(await request.json())

      if (!parsed.success) {
        console.error('Tool creation error:', parsed.error)
        return invalidPayloadResponse()
      }

      return createToolResponse({ prisma, assistant, body: parsed.data })
    },
  })

export const buildOPTIONS = () => corsOptionsResponse
