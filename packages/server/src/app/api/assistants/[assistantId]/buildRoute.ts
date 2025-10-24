import { type NextRequest, NextResponse } from 'next/server'
import {
  StorageProviderType,
  Prisma,
  ApiKeyType,
  ToolType,
  type PrismaClient,
} from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'
import { serializeAssistant } from '@/lib/assistants/serializeAssistant'
import { serializeApiAssistant } from '@/lib/assistants/serializeApiAssistant'
import { headers } from 'next/headers'
import { z } from 'zod'
import { getApiKey } from '@/lib/apiKeys/getApiKey'

type RouteProps = {
  params: Promise<{
    assistantId: string
  }>
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const params = await props.params

    const { assistantId } = params

    const headersList = await headers()
    const authorization = headersList.get('authorization')

    if (authorization) {
      const privateApiKey = await getApiKey({
        authorization,
        type: ApiKeyType.PRIVATE,
        prisma,
      })

      if (!privateApiKey) {
        return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
      }

      const assistant = await prisma.assistant.findUnique({
        where: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
        include: {
          tools: true,
          avatar: {
            include: {
              imageAvatar: true,
              iconAvatar: true,
            },
          },
        },
      })

      if (!assistant) {
        return NextResponse.json(
          { error: 'No assistant found' },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          assistant: serializeApiAssistant({ assistant }),
        },
        { headers: cacheHeaders },
      )
    }

    const workspaceAccessWhere = await getWorkspaceAccessWhere({
      publicApiKey: request.nextUrl.searchParams.get('publicApiKey'),
      prisma,
    })

    if (!workspaceAccessWhere) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    if (!assistantId) {
      return NextResponse.json(
        { error: 'No assistant id found' },
        { status: 400 },
      )
    }

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspace: workspaceAccessWhere,
      },
      include: {
        avatar: {
          include: {
            imageAvatar: true,
            iconAvatar: true,
          },
        },
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    return NextResponse.json(
      {
        assistant: serializeAssistant({ assistant }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPATCH =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const params = await props.params

    const { assistantId } = params

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

    const updateSchema = z
      .object({
        storageProviderType: z.nativeEnum(StorageProviderType).optional(),
        storageProviderAssistantId: z.string().nullable().optional(),
        modelProviderId: z.string().optional(),
        model: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        instructions: z.string().optional(),
        codeInterpreterEnabled: z.boolean().optional(),
        fileSearchEnabled: z.boolean().optional(),
      })
      .superRefine((data, ctx) => {
        if (!data.storageProviderType) return

        if (
          data.storageProviderType ===
            StorageProviderType.SUPERINTERFACE_CLOUD &&
          data.storageProviderAssistantId
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'storageProviderAssistantId should not be provided for SUPERINTERFACE_CLOUD',
            path: ['storageProviderAssistantId'],
          })
        }

        if (
          data.storageProviderType !==
            StorageProviderType.SUPERINTERFACE_CLOUD &&
          !data.storageProviderAssistantId
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'storageProviderAssistantId is required for this storage provider',
            path: ['storageProviderAssistantId'],
          })
        }
      })

    const parseResult = updateSchema.safeParse(await request.json())

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid body: ' + parseResult.error.message,
        },
        { status: 400 },
      )
    }

    const {
      storageProviderType,
      storageProviderAssistantId,
      modelProviderId,
      model,
      name,
      description,
      instructions,
      codeInterpreterEnabled,
      fileSearchEnabled,
    } = parseResult.data

    const data: Prisma.AssistantUpdateInput = {
      ...(storageProviderType !== undefined && { storageProviderType }),
      ...(storageProviderAssistantId !== undefined && {
        openaiAssistantId: storageProviderAssistantId,
      }),
      ...(modelProviderId !== undefined && {
        modelProvider: { connect: { id: modelProviderId } },
      }),
      ...(model !== undefined && { modelSlug: model }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(instructions !== undefined && { instructions }),
      tools: {
        create: [
          ...(codeInterpreterEnabled === true
            ? [
                {
                  type: ToolType.CODE_INTERPRETER,
                  codeInterpreterTool: { create: {} },
                },
              ]
            : []),
          ...(fileSearchEnabled === true
            ? [{ type: ToolType.FILE_SEARCH, fileSearchTool: { create: {} } }]
            : []),
        ],
        deleteMany: [
          ...(codeInterpreterEnabled === false
            ? [{ assistantId, type: ToolType.CODE_INTERPRETER }]
            : []),
          ...(fileSearchEnabled === false
            ? [{ assistantId, type: ToolType.FILE_SEARCH }]
            : []),
        ],
      },
    }

    const assistant = await prisma.assistant.update({
      where: {
        id: assistantId,
        workspaceId: privateApiKey.workspaceId,
      },
      data,
      include: {
        tools: true,
        avatar: {
          include: {
            imageAvatar: true,
            iconAvatar: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        assistant: serializeApiAssistant({ assistant }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildDELETE =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const params = await props.params

    const { assistantId } = params

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
        tools: true,
        avatar: {
          include: {
            imageAvatar: true,
            iconAvatar: true,
          },
        },
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    await prisma.assistant.delete({
      where: {
        id: assistant.id,
      },
    })

    return NextResponse.json(
      {
        assistant: serializeApiAssistant({ assistant }),
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
