import { headers } from 'next/headers'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { getStorageProviderAssistants } from '@/lib/storageProviders/getStorageProviderAssistants'
import { serializeApiStorageProviderAssistant } from '@/lib/storageProviders/serializeApiStorageProviderAssistant'

export const buildGET =
  ({ prisma = defaultPrisma }: { prisma?: PrismaClient } = {}) =>
  async (
    _request: NextRequest,
    props: { params: Promise<{ modelProviderId: string }> },
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

    const storageProviderAssistants = await getStorageProviderAssistants({
      modelProvider: provider,
    })

    return NextResponse.json(
      {
        storageProviderAssistants: storageProviderAssistants.map(
          (storageProviderAssistant) =>
            serializeApiStorageProviderAssistant({
              storageProviderAssistant,
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
