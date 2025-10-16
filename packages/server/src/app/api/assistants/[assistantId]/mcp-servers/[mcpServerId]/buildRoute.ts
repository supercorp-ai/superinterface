import { headers } from 'next/headers'
import { ApiKeyType, TransportType, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { validate } from 'uuid'
import { serializeApiMcpServer } from '@/lib/mcpServers/serializeApiMcpServer'
import { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'
import { normalizeMcpServerName } from '@/lib/mcpServers/normalizeMcpServerName'
import { isMcpServerLabelTaken } from '@/lib/mcpServers/isMcpServerLabelTaken'

type RouteProps = {
  params: Promise<{ assistantId: string; mcpServerId: string }>
}

const validateIds = ({
  assistantId,
  mcpServerId,
}: {
  assistantId: string
  mcpServerId: string
}) => {
  if (!validate(assistantId)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 })
  }

  if (!validate(mcpServerId)) {
    return NextResponse.json(
      { error: 'Invalid MCP server id' },
      { status: 400 },
    )
  }

  return null
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { assistantId, mcpServerId } = await props.params

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

    const validationError = validateIds({ assistantId, mcpServerId })
    if (validationError) return validationError

    const mcpServer = await prisma.mcpServer.findFirst({
      where: {
        id: mcpServerId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
      include: {
        sseTransport: true,
        httpTransport: true,
      },
    })

    if (!mcpServer) {
      return NextResponse.json(
        { error: 'No MCP server found' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        mcpServer: serializeApiMcpServer({ mcpServer }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPATCH =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const { assistantId, mcpServerId } = await props.params

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

    const validationError = validateIds({ assistantId, mcpServerId })
    if (validationError) return validationError

    const body = await request.json()

    const parsed = mcpServerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { transportType, sseTransport, httpTransport, name, description } =
      parsed.data

    let normalizedLabel: string | null = null

    if (typeof name === 'string') {
      const normalizedName = normalizeMcpServerName(name)

      if (!/[a-zA-Z0-9]/.test(normalizedName)) {
        return NextResponse.json(
          {
            error:
              'Invalid MCP server name. Use letters, numbers, spaces, or hyphens.',
          },
          { status: 400 },
        )
      }

      normalizedLabel = normalizedName
    }

    const mcpServer = await prisma.mcpServer.findFirst({
      where: {
        id: mcpServerId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
    })

    if (!mcpServer) {
      return NextResponse.json(
        { error: 'No MCP server found' },
        { status: 400 },
      )
    }

    if (normalizedLabel) {
      const isTaken = await isMcpServerLabelTaken({
        prisma,
        assistantId,
        label: normalizedLabel,
        excludeMcpServerId: mcpServerId,
      })

      if (isTaken) {
        return NextResponse.json(
          { error: 'An MCP server with that name already exists.' },
          { status: 400 },
        )
      }
    }

    const updatedMcpServer = await prisma.mcpServer.update({
      where: {
        id: mcpServerId,
      },
      data: {
        transportType,
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(transportType === TransportType.SSE
          ? {
              sseTransport: {
                update: {
                  url: sseTransport!.url,
                  headers: JSON.parse(sseTransport!.headers),
                },
              },
            }
          : {}),
        ...(transportType === TransportType.HTTP
          ? {
              httpTransport: {
                update: {
                  url: httpTransport!.url,
                  headers: JSON.parse(httpTransport!.headers),
                },
              },
            }
          : {}),
      },
      include: {
        sseTransport: true,
        httpTransport: true,
      },
    })

    return NextResponse.json(
      {
        mcpServer: serializeApiMcpServer({ mcpServer: updatedMcpServer }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildDELETE =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { assistantId, mcpServerId } = await props.params

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

    const validationError = validateIds({ assistantId, mcpServerId })
    if (validationError) return validationError

    const mcpServer = await prisma.mcpServer.findFirst({
      where: {
        id: mcpServerId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
    })

    if (!mcpServer) {
      return NextResponse.json(
        { error: 'No MCP server found' },
        { status: 400 },
      )
    }

    const deletedMcpServer = await prisma.mcpServer.delete({
      where: { id: mcpServerId },
      include: {
        sseTransport: true,
        httpTransport: true,
      },
    })

    return NextResponse.json(
      {
        mcpServer: serializeApiMcpServer({ mcpServer: deletedMcpServer }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildOPTIONS = () => () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
