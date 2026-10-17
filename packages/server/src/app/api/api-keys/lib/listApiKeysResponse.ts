import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { serializeApiKey } from '@/lib/apiKeys/serializeApiKey'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'

// Lists the public api keys of the workspace.
export const listApiKeysResponse = async ({
  prisma,
  workspaceId,
}: {
  prisma: PrismaClient
  workspaceId: string
}) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: { type: ApiKeyType.PUBLIC, workspaceId },
  })

  return NextResponse.json(
    { apiKeys: apiKeys.map((apiKey) => serializeApiKey({ apiKey })) },
    { headers: cacheHeaders },
  )
}
