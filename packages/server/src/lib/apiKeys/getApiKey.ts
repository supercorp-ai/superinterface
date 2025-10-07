import { ApiKeyType, ApiKey } from '@prisma/client'
import { validate } from 'uuid'
import { prisma } from '@/lib/prisma'

export const getApiKey = async ({
  authorization,
  type,
}: {
  authorization: string | null
  type: ApiKeyType
}): Promise<ApiKey | null> => {
  if (!authorization) {
    return null
  }

  const [, apiKeyValue] = authorization.split('Bearer ')

  if (!validate(apiKeyValue)) {
    return null
  }

  return prisma.apiKey.findFirst({
    where: { type, value: apiKeyValue },
  })
}
