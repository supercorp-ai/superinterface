import type { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeModelProvider } from '@/lib/modelProviders/serializeModelProvider'

export const listProvidersResponse = async ({
  prisma,
  workspaceId,
}: {
  prisma: PrismaClient
  workspaceId: string
}) => {
  const providers = await prisma.modelProvider.findMany({
    where: { workspaceId },
  })

  return NextResponse.json(
    {
      providers: providers.map((provider) =>
        serializeModelProvider({ provider }),
      ),
    },
    { headers: cacheHeaders },
  )
}
