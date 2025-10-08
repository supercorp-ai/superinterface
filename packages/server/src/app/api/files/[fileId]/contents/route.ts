import type { OpenAI } from 'openai'
import { isString } from 'radash'
import { type Prisma, type PrismaClient } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'
import { getPrisma } from '@/lib/prisma'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'

export const buildGET =
  ({
    prisma = getPrisma(),
    purposeAssistantsResponse = () =>
      NextResponse.json({ error: 'No file source found' }, { status: 404 }),
  }: {
    prisma?: PrismaClient
    purposeAssistantsResponse?: ({
      file,
    }: {
      file: OpenAI.Files.FileObject
      workspaceAccessWhere: Prisma.WorkspaceWhereInput
    }) => Promise<NextResponse> | NextResponse
  } = {}) =>
  async (
    request: NextRequest,
    props: {
      params: Promise<{
        fileId: string
      }>
    },
  ) => {
    const params = await props.params

    const { fileId } = params

    const assistantId = request.nextUrl.searchParams.get('assistantId')

    if (!isString(assistantId)) {
      return NextResponse.json(
        { error: 'Invalid assistantId' },
        { status: 400 },
      )
    }

    const publicApiKey = request.nextUrl.searchParams.get('publicApiKey')

    if (!isString(publicApiKey)) {
      return NextResponse.json(
        { error: 'Invalid publicApiKey' },
        { status: 400 },
      )
    }

    const workspaceAccessWhere = await getWorkspaceAccessWhere({
      publicApiKey,
      prisma,
    })

    if (!workspaceAccessWhere) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    if (!assistantId) {
      return NextResponse.json(
        { error: 'No assistantId found' },
        { status: 400 },
      )
    }

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspace: workspaceAccessWhere,
      },
      include: {
        modelProvider: true,
        tools: {
          include: {
            fileSearchTool: true,
            webSearchTool: true,
            imageGenerationTool: true,
            codeInterpreterTool: true,
            computerUseTool: true,
          },
        },
        mcpServers: {
          include: {
            computerUseTool: true,
            stdioTransport: true,
            sseTransport: true,
            httpTransport: true,
          },
        },
        functions: true,
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    if (
      isOpenaiAssistantsStorageProvider({
        storageProviderType: assistant.storageProviderType,
      }) &&
      !assistant.openaiAssistantId
    ) {
      return NextResponse.json(
        { error: 'Assistant setup is not done.' },
        { status: 400 },
      )
    }

    const assistantClient = assistantClientAdapter({ assistant, prisma })

    const file = await assistantClient.files.retrieve(fileId)

    if (!file) {
      return NextResponse.json({ error: 'No file found' }, { status: 404 })
    }

    if (file.purpose === 'assistants') {
      return purposeAssistantsResponse({ file, workspaceAccessWhere })
    }

    const fileContentResponse = await assistantClient.files.content(fileId)
    const fileData = await fileContentResponse.arrayBuffer()

    return new NextResponse(fileData, {
      headers: {
        ...cacheHeaders,
        'Content-Type':
          fileContentResponse.headers.get('Content-Type') ??
          'application/octet-stream',
        'Content-Disposition':
          fileContentResponse.headers.get('Content-Disposition') ?? 'inline',
      },
    })
  }

export const GET = buildGET({})

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
