import { headers } from 'next/headers'
import { ApiKeyType, ToolType, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { validate } from 'uuid'
import { serializeApiTool, toolInclude } from '@/lib/tools/serializeApiTool'
import { updateToolSchema } from '@/lib/tools/toolSchema'

type RouteProps = {
  params: Promise<{ assistantId: string; toolId: string }>
}

const ensureIdsValid = ({
  assistantId,
  toolId,
}: {
  assistantId: string
  toolId: string
}) => {
  if (!validate(assistantId)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 })
  }

  if (!validate(toolId)) {
    return NextResponse.json({ error: 'Invalid tool id' }, { status: 400 })
  }

  return null
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { assistantId, toolId } = await props.params

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

    const validationError = ensureIdsValid({ assistantId, toolId })
    if (validationError) return validationError

    const tool = await prisma.tool.findFirst({
      where: {
        id: toolId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
      include: toolInclude,
    })

    if (!tool) {
      return NextResponse.json({ error: 'No tool found' }, { status: 400 })
    }

    return NextResponse.json(
      {
        tool: serializeApiTool({ tool }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPATCH =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const { assistantId, toolId } = await props.params

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

    const validationError = ensureIdsValid({ assistantId, toolId })
    if (validationError) return validationError

    const body = await request.json()
    const parsed = updateToolSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const tool = await prisma.tool.findFirst({
      where: {
        id: toolId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'No tool found' }, { status: 400 })
    }

    const typeSpecificUpdate: Record<string, unknown> = {}

    if (tool.type === ToolType.FILE_SEARCH && parsed.data.fileSearchTool) {
      typeSpecificUpdate.fileSearchTool = {
        upsert: {
          create: parsed.data.fileSearchTool,
          update: parsed.data.fileSearchTool,
        },
      }
    } else if (
      tool.type === ToolType.IMAGE_GENERATION &&
      parsed.data.imageGenerationTool
    ) {
      typeSpecificUpdate.imageGenerationTool = {
        upsert: {
          create: parsed.data.imageGenerationTool,
          update: parsed.data.imageGenerationTool,
        },
      }
    } else if (
      tool.type === ToolType.COMPUTER_USE &&
      parsed.data.computerUseTool
    ) {
      typeSpecificUpdate.computerUseTool = {
        upsert: {
          create: parsed.data.computerUseTool,
          update: parsed.data.computerUseTool,
        },
      }
    }

    const updatedTool = await prisma.tool.update({
      where: { id: tool.id },
      data: typeSpecificUpdate,
      include: toolInclude,
    })

    return NextResponse.json(
      {
        tool: serializeApiTool({ tool: updatedTool }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildDELETE =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { assistantId, toolId } = await props.params

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

    const validationError = ensureIdsValid({ assistantId, toolId })
    if (validationError) return validationError

    const tool = await prisma.tool.findFirst({
      where: {
        id: toolId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'No tool found' }, { status: 400 })
    }

    const deletedTool = await prisma.tool.delete({
      where: { id: tool.id },
      include: toolInclude,
    })

    return NextResponse.json(
      {
        tool: serializeApiTool({ tool: deletedTool }),
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
