import type { PrismaClient } from '@prisma/client'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { functionSchema } from '@/lib/functions/functionSchema'
import { functionInclude } from '@/lib/functions/functionInclude'
import { functionResponse } from '@/lib/functions/functionResponse'
import { noFunctionFoundResponse } from '@/lib/functions/noFunctionFoundResponse'
import { authorizeFunctionRequest } from './lib/authorizeFunctionRequest'
import { updateFunctionResponse } from './lib/updateFunctionResponse'
import { deleteFunctionResponse } from './lib/deleteFunctionResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeFunctionRequest({ prisma }),
    handle: async ({ where }) => {
      const fn = await prisma.function.findFirst({
        where,
        include: functionInclude,
      })

      if (!fn) {
        return noFunctionFoundResponse()
      }

      return functionResponse({ fn })
    },
  })

export const buildPATCH = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeFunctionRequest({ prisma }),
    handle: async ({ request, where }) => {
      const parsed = functionSchema.safeParse(await request.json())

      if (!parsed.success) {
        return invalidPayloadResponse()
      }

      return updateFunctionResponse({ prisma, where, body: parsed.data })
    },
  })

export const buildDELETE = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeFunctionRequest({ prisma }),
    handle: ({ where }) => deleteFunctionResponse({ prisma, where }),
  })

export const buildOPTIONS = () => corsOptionsResponse
