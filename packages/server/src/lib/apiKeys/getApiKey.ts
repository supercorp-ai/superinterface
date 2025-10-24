import { ApiKeyType, ApiKey, type PrismaClient } from '@prisma/client'
import { validate } from 'uuid'

export const getApiKey = async ({
  authorization,
  type,
  prisma,
}: {
  authorization: string | null
  type: ApiKeyType
  prisma: PrismaClient
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
