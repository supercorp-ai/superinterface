import { type NextRequest, NextResponse } from 'next/server'
import { ApiKeyType, InitialMessage, type PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { serializeApiInitialMessage } from '@/lib/initialMessages/serializeApiInitialMessage'
import { initialMessagesSchema } from '@/lib/initialMessages/schema'
import { updateInitialMessages } from '@/lib/initialMessages/updateInitialMessages'
import { getApiKey } from '@/lib/apiKeys/getApiKey'

export const buildGET =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (
    _request: NextRequest,
    props: { params: Promise<{ assistantId: string }> },
  ) => {
    const { assistantId } = await props.params

    const headersList = await headers()
    const authorization = headersList.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'No authorization header found' },
        { status: 400 },
      )
    }

    const privateApiKey = await getApiKey({
      type: ApiKeyType.PRIVATE,
      authorization,
      prisma,
    })

    if (!privateApiKey) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspaceId: privateApiKey.workspaceId,
      },
      include: {
        initialMessages: {
          orderBy: {
            orderNumber: 'asc',
          },
        },
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    return NextResponse.json(
      {
        initialMessages: assistant.initialMessages.map((m) =>
          serializeApiInitialMessage({ initialMessage: m }),
        ),
      },
      { headers: cacheHeaders },
    )
  }

export const GET = buildGET()

export const buildPUT =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (
    request: NextRequest,
    props: { params: Promise<{ assistantId: string }> },
  ) => {
    const { assistantId } = await props.params

    const headersList = await headers()
    const authorization = headersList.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'No authorization header found' },
        { status: 400 },
      )
    }

    const privateApiKey = await getApiKey({
      authorization,
      type: ApiKeyType.PRIVATE,
      prisma,
    })

    if (!privateApiKey) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    const body = await request.json()
    const bodyParse = initialMessagesSchema.safeParse(body)

    if (!bodyParse.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const { initialMessages } = bodyParse.data

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    const messages = await updateInitialMessages({
      assistantId: assistant.id,
      initialMessages,
      prisma,
    })

    return NextResponse.json(
      {
        initialMessages: messages.map((m: InitialMessage) =>
          serializeApiInitialMessage({ initialMessage: m }),
        ),
      },
      { headers: cacheHeaders },
    )
  }

export const PUT = buildPUT()

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
