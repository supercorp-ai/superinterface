import { type NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { getAuthorizationHeader } from '@/lib/apiKeys/getAuthorizationHeader'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { authorizeAssistantRequest } from '@/lib/assistants/authorizeAssistantRequest'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { privateAssistantResponse } from './lib/privateAssistantResponse'
import { publicAssistantResponse } from './lib/publicAssistantResponse'
import { updateAssistantSchema } from './lib/updateAssistantSchema'
import { updateAssistantResponse } from './lib/updateAssistantResponse'
import { deleteAssistantResponse } from './lib/deleteAssistantResponse'

type RouteProps = {
  params: Promise<{
    assistantId: string
  }>
}

// Private api keys in the authorization header get the full assistant,
// public api keys in the query string get its public fields.
export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const { assistantId } = await props.params

    const authorization = await getAuthorizationHeader()

    if (authorization) {
      return privateAssistantResponse({ prisma, authorization, assistantId })
    }

    return publicAssistantResponse({ prisma, request, assistantId })
  }

export const buildPATCH = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: async ({ request, where }) => {
      const parseResult = updateAssistantSchema.safeParse(await request.json())

      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: 'Invalid body: ' + parseResult.error.message,
          },
          { status: 400 },
        )
      }

      return updateAssistantResponse({ prisma, where, body: parseResult.data })
    },
  })

export const buildDELETE = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: ({ where }) => deleteAssistantResponse({ prisma, where }),
  })

export const buildOPTIONS = () => corsOptionsResponse
