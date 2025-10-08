import { headers } from 'next/headers'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { serializeApiKey } from '@/lib/apiKeys/serializeApiKey'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { getOrganizationApiKey } from '@/lib/organizationApiKeys/getOrganizationApiKey'

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

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        type: ApiKeyType.PUBLIC,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    return NextResponse.json(
      {
        apiKeys: apiKeys.map((apiKey) => serializeApiKey({ apiKey })),
      },
      { headers: cacheHeaders },
    )
  }

export const GET = buildGET()

export const buildPOST =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (request: Request) => {
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'No authorization header found' },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => null)

    const organizationApiKey = await getOrganizationApiKey({
      authorization,
      prisma,
    })

    if (organizationApiKey) {
      const createSchemaOrganizationApiKey = z.object({
        name: z.string().min(1).optional(),
        type: z.nativeEnum(ApiKeyType),
        workspaceId: z.string().min(1).optional(),
      })

      const parsedOrganizationApiKey =
        createSchemaOrganizationApiKey.safeParse(body)

      if (!parsedOrganizationApiKey.success) {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
      }

      const workspace = await prisma.workspace.findUnique({
        where: {
          id: parsedOrganizationApiKey.data.workspaceId,
          organizationId: organizationApiKey.organizationId,
        },
      })

      if (!workspace) {
        return NextResponse.json(
          { error: 'Invalid workspace' },
          { status: 400 },
        )
      }

      const apiKey = await prisma.apiKey.create({
        data: {
          type: parsedOrganizationApiKey.data.type,
          name: parsedOrganizationApiKey.data.name,
          workspaceId: workspace.id,
        },
      })

      return NextResponse.json(
        {
          apiKey: serializeApiKey({ apiKey }),
        },
        { headers: cacheHeaders },
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

    const createSchema = z.object({
      name: z.string().min(1).optional(),
    })

    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { name } = parsed.data

    const workspaceId = privateApiKey.workspaceId

    const apiKey = await prisma.apiKey.create({
      data: {
        type: ApiKeyType.PUBLIC,
        name,
        workspaceId,
      },
    })

    return NextResponse.json(
      {
        apiKey: serializeApiKey({ apiKey }),
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
