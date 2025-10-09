import { headers } from 'next/headers'
import {
  ApiKeyType,
  ModelProviderType,
  Prisma,
  type PrismaClient,
} from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeModelProvider } from '@/lib/modelProviders/serializeModelProvider'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { validate } from 'uuid'

type RouteProps = {
  params: Promise<{ modelProviderId: string }>
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { modelProviderId } = await props.params

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

    if (!validate(modelProviderId)) {
      return NextResponse.json(
        { error: 'Invalid provider id' },
        { status: 400 },
      )
    }

    const provider = await prisma.modelProvider.findFirst({
      where: {
        id: modelProviderId,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!provider) {
      return NextResponse.json({ error: 'No provider found' }, { status: 400 })
    }

    return NextResponse.json(
      {
        provider: serializeModelProvider({ provider }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPATCH =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const { modelProviderId } = await props.params

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

    if (!validate(modelProviderId)) {
      return NextResponse.json(
        { error: 'Invalid provider id' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const schema = z.object({
      type: z.nativeEnum(ModelProviderType).optional(),
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
      apiKey: providerKey,
      endpoint,
      apiVersion,
      name,
    } = parsed.data
    const updateData: Prisma.ModelProviderUpdateInput = {
      ...(type ? { type } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(providerKey !== undefined ? { apiKey: providerKey } : {}),
      ...(endpoint !== undefined ? { endpoint } : {}),
      ...(apiVersion !== undefined ? { apiVersion } : {}),
    }

    const existingProvider = await prisma.modelProvider.findFirst({
      where: {
        id: modelProviderId,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!existingProvider) {
      return NextResponse.json({ error: 'No provider found' }, { status: 400 })
    }

    const provider = await prisma.modelProvider.update({
      where: { id: modelProviderId },
      data: updateData,
    })

    return NextResponse.json(
      {
        provider: serializeModelProvider({ provider }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildDELETE =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { modelProviderId } = await props.params

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

    if (!validate(modelProviderId)) {
      return NextResponse.json(
        { error: 'Invalid provider id' },
        { status: 400 },
      )
    }

    const assistantsUsingProvider = await prisma.assistant.count({
      where: {
        modelProviderId: modelProviderId,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (assistantsUsingProvider > 0) {
      return NextResponse.json({ error: 'Provider in use' }, { status: 400 })
    }

    const existingProvider = await prisma.modelProvider.findFirst({
      where: {
        id: modelProviderId,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!existingProvider) {
      return NextResponse.json({ error: 'No provider found' }, { status: 400 })
    }

    const provider = await prisma.modelProvider.delete({
      where: { id: modelProviderId },
    })

    return NextResponse.json(
      {
        provider: serializeModelProvider({ provider }),
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
