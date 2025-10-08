import { type NextRequest, NextResponse } from 'next/server'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getPrisma } from '@/lib/prisma'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { serializeApiFunction } from '@/lib/functions/serializeApiFunction'
import { functionSchema } from '@/lib/functions/functionSchema'
import { createFunction } from '@/lib/functions/createFunction'

export const buildGET =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    _request: NextRequest,
    props: {
      params: Promise<{ assistantId: string }>
    },
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
        functions: {
          include: {
            handler: {
              include: {
                requestHandler: true,
                firecrawlHandler: true,
                replicateHandler: true,
                clientToolHandler: true,
                assistantHandler: true,
                createTaskHandler: true,
                listTasksHandler: true,
                updateTaskHandler: true,
                deleteTaskHandler: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    return NextResponse.json(
      {
        functions: assistant.functions.map((fn) =>
          serializeApiFunction({
            fn,
          }),
        ),
      },
      { headers: cacheHeaders },
    )
  }

export const GET = buildGET()

export const buildPOST =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    request: NextRequest,
    props: {
      params: Promise<{ assistantId: string }>
    },
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

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = functionSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Function creation error:', parsed.error)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const fn = await createFunction({
      parsedInput: parsed.data,
      assistant,
      include: {
        handler: {
          include: {
            requestHandler: true,
            firecrawlHandler: true,
            replicateHandler: true,
            clientToolHandler: true,
            assistantHandler: true,
            createTaskHandler: true,
            listTasksHandler: true,
            updateTaskHandler: true,
            deleteTaskHandler: true,
          },
        },
      },
      prisma,
    })

    return NextResponse.json(
      {
        function: serializeApiFunction({ fn }),
      },
      { headers: cacheHeaders },
    )
  }

export const POST = buildPOST()

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
