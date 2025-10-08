import { type NextRequest, NextResponse } from 'next/server'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { headers } from 'next/headers'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { serializeApiKey } from '@/lib/apiKeys/serializeApiKey'
import { z } from 'zod'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { validate } from 'uuid'

export const buildGET =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (
    request: NextRequest,
    props: {
      params: Promise<{ apiKeyId: string }>
    },
  ) => {
    const params = await props.params
    const { apiKeyId } = params

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

    if (!validate(apiKeyId)) {
      return NextResponse.json({ error: 'Invalid api key id' }, { status: 400 })
    }

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

export const GET = buildGET()

export const buildPATCH =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (
    request: NextRequest,
    props: { params: Promise<{ apiKeyId: string }> },
  ) => {
    const params = await props.params
    const { apiKeyId } = params

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

    if (!validate(apiKeyId)) {
      return NextResponse.json({ error: 'Invalid api key id' }, { status: 400 })
    }

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

export const PATCH = buildPATCH()

export const buildDELETE =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (
    request: NextRequest,
    props: { params: Promise<{ apiKeyId: string }> },
  ) => {
    const params = await props.params
    const { apiKeyId } = params

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
    if (!validate(apiKeyId)) {
      return NextResponse.json({ error: 'Invalid api key id' }, { status: 400 })
    }

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

export const DELETE = buildDELETE()

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
