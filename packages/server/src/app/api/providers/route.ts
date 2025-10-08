import { headers } from 'next/headers'
import {
  ApiKeyType,
  ModelProviderType,
  type PrismaClient,
} from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { serializeModelProvider } from '@/lib/modelProviders/serializeModelProvider'
import { getApiKey } from '@/lib/apiKeys/getApiKey'

export const buildGET =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async () => {
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

    const providers = await prisma.modelProvider.findMany({
      where: {
        workspaceId: privateApiKey.workspaceId,
      },
    })

    return NextResponse.json(
      {
        providers: providers.map((p) =>
          serializeModelProvider({ provider: p }),
        ),
      },
      { headers: cacheHeaders },
    )
  }

export const GET = buildGET()

export const buildPOST =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (request: NextRequest) => {
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

    const body = await request.json()
    const schema = z.object({
      type: z.nativeEnum(ModelProviderType),
      name: z.string().optional(),
      apiKey: z.string().optional(),
      endpoint: z.string().optional().nullable(),
      apiVersion: z.string().optional().nullable(),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const {
      type,
      name,
      apiKey: providerKey,
      endpoint,
      apiVersion,
    } = parsed.data
    const workspaceId = privateApiKey.workspaceId

    const provider = await prisma.modelProvider.create({
      data: {
        type: type as ModelProviderType,
        name: name ?? '',
        apiKey: providerKey ?? '',
        endpoint: endpoint ?? null,
        apiVersion: apiVersion ?? null,
        workspaceId,
      },
    })

    return NextResponse.json(
      {
        provider: serializeModelProvider({ provider }),
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
