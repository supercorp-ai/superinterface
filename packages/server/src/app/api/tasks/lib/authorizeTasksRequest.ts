import { headers } from 'next/headers'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { getApiKey } from '@/lib/apiKeys/getApiKey'

export const authorizeTasksRequest = async ({
  prisma,
}: {
  prisma: PrismaClient
}) => {
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  if (!authorization) {
    return { ok: false as const, error: 'No authorization header found' }
  }

  const privateApiKey = await getApiKey({
    authorization,
    type: ApiKeyType.PRIVATE,
    prisma,
  })
  if (!privateApiKey) return { ok: false as const, error: 'Invalid api key' }

  return { ok: true as const, workspaceId: privateApiKey.workspaceId }
}
