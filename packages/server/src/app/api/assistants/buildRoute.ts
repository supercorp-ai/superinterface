import type { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { corsOptionsResponse } from '@/lib/cache/corsOptionsResponse'
import { authorizedWorkspaceResponse } from './lib/authorizedWorkspaceResponse'
import { createAssistantSchema } from './lib/createAssistantSchema'
import { listAssistantsResponse } from './lib/listAssistantsResponse'
import { createAssistantResponse } from './lib/createAssistantResponse'

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async () =>
    authorizedWorkspaceResponse({
      prisma,
      respond: ({ workspaceId }) =>
        listAssistantsResponse({ prisma, workspaceId }),
    })

export const buildPOST =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: Request) =>
    authorizedWorkspaceResponse({
      prisma,
      respond: async ({ workspaceId }) => {
        const parseResult = createAssistantSchema.safeParse(
          await request.json(),
        )

        if (!parseResult.success) {
          return NextResponse.json(
            {
              error: `Missing required fields. ${JSON.stringify(parseResult.error.format())}`,
            },
            { status: 400 },
          )
        }

        return createAssistantResponse({
          prisma,
          workspaceId,
          body: parseResult.data,
        })
      },
    })

export const buildOPTIONS = () => corsOptionsResponse

export { createAssistantSchema }
