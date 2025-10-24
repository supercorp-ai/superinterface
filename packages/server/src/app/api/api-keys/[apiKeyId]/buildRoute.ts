import { type NextRequest, NextResponse } from 'next/server'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiKey } from '@/lib/apiKeys/serializeApiKey'
import { z } from 'zod'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { validate } from 'uuid'

type RouteProps = {
  params: Promise<{ apiKeyId: string }>
}

const ensureValidApiKeyId = (apiKeyId: string) => {
  if (!validate(apiKeyId)) {
    return NextResponse.json({ error: 'Invalid api key id' }, { status: 400 })
  }

  return null
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { apiKeyId } = await props.params

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

    const validationError = ensureValidApiKeyId(apiKeyId)
    if (validationError) return validationError

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        type: ApiKeyType.PUBLIC,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'No api key found' }, { status: 400 })
    }

    return NextResponse.json(
      { apiKey: serializeApiKey({ apiKey }) },
      { headers: cacheHeaders },
    )
  }

export const buildPATCH =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const { apiKeyId } = await props.params

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

    const validationError = ensureValidApiKeyId(apiKeyId)
    if (validationError) return validationError

    const body = await request.json().catch(() => null)
    const schema = z.object({ name: z.string().min(1) })
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'No name found' }, { status: 400 })
    }

    const { name } = parsed.data

    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        type: ApiKeyType.PUBLIC,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!existingApiKey) {
      return NextResponse.json({ error: 'No api key found' }, { status: 400 })
    }

    const apiKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { name },
    })

    return NextResponse.json(
      { apiKey: serializeApiKey({ apiKey }) },
      { headers: cacheHeaders },
    )
  }

export const buildDELETE =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { apiKeyId } = await props.params

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

    const validationError = ensureValidApiKeyId(apiKeyId)
    if (validationError) return validationError

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        type: ApiKeyType.PUBLIC,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'No api key found' }, { status: 400 })
    }

    const deletedApiKey = await prisma.apiKey.delete({
      where: { id: apiKey.id },
    })

    return NextResponse.json(
      { apiKey: serializeApiKey({ apiKey: deletedApiKey }) },
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
