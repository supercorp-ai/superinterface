import { headers } from 'next/headers'
import { ApiKeyType, StorageProviderType, ToolType } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma } from '@/lib/prisma'
import { serializeApiAssistant } from '@/lib/assistants/serializeApiAssistant'
import { getApiKey } from '@/lib/apiKeys/getApiKey'

export const GET = async () => {
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

  const assistants = await prisma.assistant.findMany({
    where: {
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

  return NextResponse.json(
    {
      assistants: assistants.map((a) =>
        serializeApiAssistant({ assistant: a }),
      ),
    },
    { headers: cacheHeaders },
  )
}

const createAssistantSchema = z
  .object({
    storageProviderType: z.nativeEnum(StorageProviderType),
    storageProviderAssistantId: z.string().nullable().optional(),
    modelProviderId: z.string(),
    model: z.string(),
    name: z.string().optional(),
    description: z.string().optional().default(''),
    instructions: z.string().optional().default(''),
    codeInterpreterEnabled: z.boolean().optional().default(false),
    fileSearchEnabled: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (
      data.storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD &&
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
      data.storageProviderType !== StorageProviderType.SUPERINTERFACE_CLOUD &&
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

export const POST = async (request: Request) => {
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

  const parseResult = createAssistantSchema.safeParse(await request.json())

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: `Missing required fields. ${JSON.stringify(parseResult.error.format())}`,
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

  const workspaceId = privateApiKey.workspaceId

  const assistant = await prisma.assistant.create({
    data: {
      workspace: { connect: { id: workspaceId } },
      modelProvider: { connect: { id: modelProviderId } },
      modelSlug: model,
      name,
      description,
      instructions,
      storageProviderType,
      openaiAssistantId: storageProviderAssistantId ?? null,
      tools: {
        create: [
          ...(fileSearchEnabled
            ? [
                {
                  type: ToolType.FILE_SEARCH,
                  fileSearchTool: {
                    create: {},
                  },
                },
              ]
            : []),
          ...(codeInterpreterEnabled
            ? [
                {
                  type: ToolType.CODE_INTERPRETER,
                  codeInterpreterTool: {
                    create: {},
                  },
                },
              ]
            : []),
        ],
      },
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

  return NextResponse.json(
    {
      assistant: serializeApiAssistant({ assistant }),
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
