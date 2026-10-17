import type { PrismaClient } from '@prisma/client'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { authorizeAssistantRequest } from '@/lib/assistants/authorizeAssistantRequest'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { functionSchema } from '@/lib/functions/functionSchema'
import { functionInclude } from '@/lib/functions/functionInclude'
import { functionResponse } from '@/lib/functions/functionResponse'
import { createFunction } from '@/lib/functions/createFunction'
import { listFunctionsResponse } from './lib/listFunctionsResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: ({ where }) => listFunctionsResponse({ prisma, where }),
  })

export const buildPOST = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: async ({ request, where }) => {
      const assistant = await prisma.assistant.findFirst({ where })

      if (!assistant) {
        return noAssistantFoundResponse()
      }

      const parsed = functionSchema.safeParse(await request.json())

      if (!parsed.success) {
        console.error('Function creation error:', parsed.error)
        return invalidPayloadResponse()
      }

      const fn = await createFunction({
        parsedInput: parsed.data,
        assistant,
        include: functionInclude,
        prisma,
      })

      return functionResponse({ fn })
    },
  })

export const buildOPTIONS = () => corsOptionsResponse
