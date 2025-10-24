import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { getApiKey } from './getApiKey'

export const workspaceAccessWhere = async ({
  publicApiKey,
  prisma,
}: {
  publicApiKey: string | null
  prisma: PrismaClient
}) => {
  const apiKey = await getApiKey({
    authorization: publicApiKey ? `Bearer ${publicApiKey}` : null,
    type: ApiKeyType.PUBLIC,
    prisma,
  })

  if (!apiKey) return null

  return {
    apiKeys: {
      some: { id: apiKey.id },
    },
  }
}
