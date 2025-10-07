import { ApiKeyType } from '@prisma/client'
import { getApiKey } from './getApiKey'

export const workspaceAccessWhere = async ({
  publicApiKey,
}: {
  publicApiKey: string | null
}) => {
  const apiKey = await getApiKey({
    authorization: publicApiKey ? `Bearer ${publicApiKey}` : null,
    type: ApiKeyType.PUBLIC,
  })

  if (!apiKey) return null

  return {
    apiKeys: {
      some: { id: apiKey.id },
    },
  }
}
