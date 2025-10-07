import { headers } from 'next/headers'
import { ApiKeyType, TransportType } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma } from '@/lib/prisma'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { validate } from 'uuid'
import { serializeApiMcpServer } from '@/lib/mcpServers/serializeApiMcpServer'
import { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'

export const GET = async (
  _request: NextRequest,
  props: { params: Promise<{ assistantId: string; mcpServerId: string }> },
) => {
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
  })

  if (!privateApiKey) {
    return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
  }

  if (!validate(assistantId)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 })
  }

  if (!validate(mcpServerId)) {
    return NextResponse.json(
      { error: 'Invalid MCP server id' },
      { status: 400 },
    )
  }

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
    return NextResponse.json({ error: 'No MCP server found' }, { status: 400 })
  }

  return NextResponse.json(
    {
      mcpServer: serializeApiMcpServer({ mcpServer }),
    },
    { headers: cacheHeaders },
  )
}

export const PATCH = async (
  request: NextRequest,
  props: { params: Promise<{ assistantId: string; mcpServerId: string }> },
) => {
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
  })

  if (!privateApiKey) {
    return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
  }

  if (!validate(assistantId)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 })
  }

  if (!validate(mcpServerId)) {
    return NextResponse.json(
      { error: 'Invalid MCP server id' },
      { status: 400 },
    )
  }

  const body = await request.json()

  const parsed = mcpServerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { transportType, sseTransport, httpTransport } = parsed.data

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
    return NextResponse.json({ error: 'No MCP server found' }, { status: 400 })
  }

  const updatedMcpServer = await prisma.mcpServer.update({
    where: {
      id: mcpServerId,
    },
    data: {
      transportType,
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

export const DELETE = async (
  _request: NextRequest,
  props: { params: Promise<{ assistantId: string; mcpServerId: string }> },
) => {
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
  })

  if (!privateApiKey) {
    return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
  }

  if (!validate(assistantId)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 })
  }

  if (!validate(mcpServerId)) {
    return NextResponse.json(
      { error: 'Invalid MCP server id' },
      { status: 400 },
    )
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
    return NextResponse.json({ error: 'No MCP server found' }, { status: 400 })
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

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
