import { type NextRequest, NextResponse } from 'next/server'
import { ApiKeyType, TransportType, type PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { serializeApiMcpServer } from '@/lib/mcpServers/serializeApiMcpServer'
import { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'

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
        mcpServers: {
          include: {
            stdioTransport: true,
            sseTransport: true,
            httpTransport: true,
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
        mcpServers: assistant.mcpServers.map((mcpServer) =>
          serializeApiMcpServer({
            mcpServer,
          }),
        ),
      },
      { headers: cacheHeaders },
    )
  }

export const GET = buildGET()

export const buildPOST =
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
    const parsed = mcpServerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { transportType, sseTransport, httpTransport } = parsed.data

    const workspaceId = privateApiKey.workspaceId

    const assistant = await prisma.assistant.findFirst({
      where: { id: assistantId, workspaceId },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    const mcpServer = await prisma.mcpServer.create({
      data: {
        transportType,
        ...(transportType === TransportType.SSE
          ? {
              sseTransport: {
                create: {
                  url: sseTransport!.url,
                  headers: JSON.parse(sseTransport!.headers),
                },
              },
            }
          : {}),
        ...(transportType === TransportType.HTTP
          ? {
              httpTransport: {
                create: {
                  url: httpTransport!.url,
                  headers: JSON.parse(httpTransport!.headers),
                },
              },
            }
          : {}),
        assistant: {
          connect: {
            id: assistantId,
            workspaceId,
          },
        },
      },
      include: {
        stdioTransport: true,
        sseTransport: true,
        httpTransport: true,
      },
    })

    return NextResponse.json(
      {
        mcpServer: serializeApiMcpServer({ mcpServer }),
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
