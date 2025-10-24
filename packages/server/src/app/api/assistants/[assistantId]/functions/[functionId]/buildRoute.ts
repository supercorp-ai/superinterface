import { headers } from 'next/headers'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { validate } from 'uuid'
import { serializeApiFunction } from '@/lib/functions/serializeApiFunction'
import { functionSchema } from '@/lib/functions/functionSchema'
import { updateFunction } from '@/lib/functions/updateFunction'

type RouteProps = {
  params: Promise<{ assistantId: string; functionId: string }>
}

const ensureIdsValid = ({
  assistantId,
  functionId,
}: {
  assistantId: string
  functionId: string
}) => {
  if (!validate(assistantId)) {
    return NextResponse.json({ error: 'Invalid assistant id' }, { status: 400 })
  }

  if (!validate(functionId)) {
    return NextResponse.json({ error: 'Invalid function id' }, { status: 400 })
  }

  return null
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { assistantId, functionId } = await props.params

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

    const validationError = ensureIdsValid({ assistantId, functionId })
    if (validationError) return validationError

    const fn = await prisma.function.findFirst({
      where: {
        id: functionId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
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
    })

    if (!fn) {
      return NextResponse.json({ error: 'No function found' }, { status: 400 })
    }

    return NextResponse.json(
      {
        function: serializeApiFunction({ fn }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPATCH =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const { assistantId, functionId } = await props.params

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

    const validationError = ensureIdsValid({ assistantId, functionId })
    if (validationError) return validationError

    const body = await request.json()

    const parsed = functionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const fn = await prisma.function.findFirst({
      where: {
        id: functionId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
      include: {
        assistant: true,
      },
    })

    if (!fn) {
      return NextResponse.json({ error: 'No function found' }, { status: 400 })
    }

    const updatedFunction = await updateFunction({
      fn,
      parsedInput: parsed.data,
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
        function: serializeApiFunction({ fn: updatedFunction }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildDELETE =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { assistantId, functionId } = await props.params

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

    const validationError = ensureIdsValid({ assistantId, functionId })
    if (validationError) return validationError

    const fn = await prisma.function.findFirst({
      where: {
        id: functionId,
        assistant: {
          id: assistantId,
          workspaceId: privateApiKey.workspaceId,
        },
      },
    })

    if (!fn) {
      return NextResponse.json({ error: 'No function found' }, { status: 400 })
    }

    const deletedFunction = await prisma.function.delete({
      where: { id: fn.id },
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
    })

    return NextResponse.json(
      {
        mcpServer: serializeApiFunction({ fn: deletedFunction }),
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
