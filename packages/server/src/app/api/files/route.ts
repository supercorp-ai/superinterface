import { isString } from 'radash'
import type OpenAI from 'openai'
import { StorageProviderType, type PrismaClient } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'
import { getPrisma } from '@/lib/prisma'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'

export const buildPOST =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (request: NextRequest) => {
    const formData = await request.formData()
    const assistantId = formData.get('assistantId')

    if (!isString(assistantId)) {
      return NextResponse.json(
        { error: 'Invalid assistantId' },
        { status: 400 },
      )
    }

    const publicApiKey = formData.get('publicApiKey')

    if (!isString(publicApiKey)) {
      return NextResponse.json(
        { error: 'Invalid publicApiKey' },
        { status: 400 },
      )
    }

    const file = formData.get('file')

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

    if (!file) {
      return NextResponse.json({ error: 'No file found' }, { status: 400 })
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
    const purpose =
      (formData.get('purpose') as OpenAI.FilePurpose) ?? 'assistants'

    const createFileResponse = await assistantClient.files.create({
      // @ts-expect-error file is Uploadable
      file,
      purpose,
      ...(assistant.storageProviderType === StorageProviderType.OPENAI
        ? {
            expires_after: {
              anchor: 'created_at',
              seconds: 2592000, // 30 days
            },
          }
        : {}),
    })

    return NextResponse.json(
      {
        file: createFileResponse,
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
