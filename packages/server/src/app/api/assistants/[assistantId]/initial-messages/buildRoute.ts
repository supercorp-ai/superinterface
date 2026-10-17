import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { authorizedRouteHandler } from '@/lib/apiKeys/authorizedRouteHandler'
import { authorizeAssistantRequest } from '@/lib/assistants/authorizeAssistantRequest'
import { initialMessagesSchema } from '@/lib/initialMessages/schema'
import { listInitialMessagesResponse } from './lib/listInitialMessagesResponse'
import { replaceInitialMessagesResponse } from './lib/replaceInitialMessagesResponse'

export const buildGET = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: ({ where }) => listInitialMessagesResponse({ prisma, where }),
  })

export const buildPUT = ({ prisma }: { prisma: PrismaClient }) =>
  authorizedRouteHandler({
    authorize: authorizeAssistantRequest({ prisma }),
    handle: async ({ request, where }) => {
      const parsed = initialMessagesSchema.safeParse(await request.json())

      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
      }

      return replaceInitialMessagesResponse({
        prisma,
        where,
        initialMessages: parsed.data.initialMessages,
      })
    },
  })

export const buildOPTIONS = () => corsOptionsResponse
