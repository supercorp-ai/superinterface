import { type NextRequest, NextResponse } from 'next/server'
import { ApiKeyType, ToolType, type PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { serializeApiTool, toolInclude } from '@/lib/tools/serializeApiTool'
import { toolSchema } from '@/lib/tools/toolSchema'
import { isToolConfigAvailable } from '@/lib/tools/isToolConfigAvailable'

type RouteProps = {
  params: Promise<{ assistantId: string }>
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
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
        tools: {
          include: toolInclude,
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
        tools: assistant.tools.map((tool) => serializeApiTool({ tool })),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPOST =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
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
      include: {
        modelProvider: true,
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = toolSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Tool creation error:', parsed.error)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { type } = parsed.data

    if (
      !isToolConfigAvailable({
        toolType: type,
        modelProviderType: assistant.modelProvider.type,
        storageProviderType: assistant.storageProviderType,
      })
    ) {
      return NextResponse.json(
        {
          error: `Tool type ${type} is not available for this assistant's provider configuration`,
        },
        { status: 400 },
      )
    }

    const typeSpecificCreate: Record<string, unknown> = {}

    if (type === ToolType.FILE_SEARCH) {
      typeSpecificCreate.fileSearchTool = {
        create: parsed.data.fileSearchTool ?? {},
      }
    } else if (type === ToolType.WEB_SEARCH) {
      typeSpecificCreate.webSearchTool = { create: {} }
    } else if (type === ToolType.CODE_INTERPRETER) {
      typeSpecificCreate.codeInterpreterTool = { create: {} }
    } else if (type === ToolType.IMAGE_GENERATION) {
      typeSpecificCreate.imageGenerationTool = {
        create: parsed.data.imageGenerationTool ?? {},
      }
    } else if (type === ToolType.COMPUTER_USE) {
      typeSpecificCreate.computerUseTool = {
        create: parsed.data.computerUseTool ?? {},
      }
    }

    const tool = await prisma.tool.create({
      data: {
        type,
        assistantId: assistant.id,
        ...typeSpecificCreate,
      },
      include: toolInclude,
    })

    return NextResponse.json(
      {
        tool: serializeApiTool({ tool }),
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
