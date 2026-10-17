import { type NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { listMessagesParamsSchema } from './lib/listMessagesParamsSchema'
import { parseCreateMessageBody } from './lib/parseCreateMessageBody'
import { authorizePublicApiKey } from './lib/authorizePublicApiKey'
import { listMessagesResponse } from './lib/listMessagesResponse'
import { findCreateMessageRequestAssistant } from './lib/findCreateMessageRequestAssistant'
import { sendUserMessage } from './lib/sendUserMessage'
import type { OnSuccessCreateThread } from './lib/onSuccessCreateThread'

export const maxDuration = 800

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest) => {
    const { publicApiKey, ...params } = listMessagesParamsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )

    const authorized = await authorizePublicApiKey({ publicApiKey, prisma })

    if (authorized.errorResponse) return authorized.errorResponse

    return listMessagesResponse({
      prisma,
      workspaceAccessWhere: authorized.workspaceAccessWhere,
      ...params,
    })
  }

export const buildPOST =
  ({
    prisma,
    onSuccessCreateThread = () => void 0,
  }: {
    prisma: PrismaClient
    onSuccessCreateThread?: OnSuccessCreateThread
  }) =>
  async (request: NextRequest) => {
    const { publicApiKey, assistantId, threadId, message, variables } =
      parseCreateMessageBody({ body: await request.json() })

    const authorized = await authorizePublicApiKey({ publicApiKey, prisma })

    if (authorized.errorResponse) return authorized.errorResponse

    const found = await findCreateMessageRequestAssistant({
      prisma,
      workspaceAccessWhere: authorized.workspaceAccessWhere,
      assistantId,
      threadId,
      message,
    })

    if (found.errorResponse) return found.errorResponse

    return sendUserMessage({
      assistant: found.assistant,
      prisma,
      message,
      variables,
      onSuccessCreateThread,
      signal: request.signal,
    })
  }

export const buildOPTIONS = () => () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
