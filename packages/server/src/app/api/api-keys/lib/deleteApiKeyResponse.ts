import type { PrismaClient } from '@prisma/client'
import { apiKeyResponse } from './apiKeyResponse'
import type { PublicApiKeyWhere } from './PublicApiKeyWhere'
import { withPublicApiKey } from './withPublicApiKey'

export const deleteApiKeyResponse = ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: PublicApiKeyWhere
}) =>
  withPublicApiKey({
    prisma,
    where,
    respond: async (apiKey) =>
      apiKeyResponse({
        apiKey: await prisma.apiKey.delete({ where: { id: apiKey.id } }),
      }),
  })
