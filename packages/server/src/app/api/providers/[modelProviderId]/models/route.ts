import { headers } from 'next/headers'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getPrisma } from '@/lib/prisma'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { getModels } from '@/lib/models/getModels'
import { serializeApiModel } from '@/lib/models/serializeApiModel'

export const buildGET =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    _request: NextRequest,
    props: {
      params: Promise<{ modelProviderId: string }>
    },
  ) => {
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

    const provider = await prisma.modelProvider.findUnique({
      where: {
        id: modelProviderId,
        workspaceId: privateApiKey.workspaceId,
      },
    })

    if (!provider) {
      return NextResponse.json({ error: 'No provider found' }, { status: 400 })
    }

    const models = await getModels({
      modelProvider: provider,
    })

    return NextResponse.json(
      {
        models: models.map((model) =>
          serializeApiModel({
            model,
          }),
        ),
      },
      { headers: cacheHeaders },
    )
  }

export const GET = buildGET()

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
