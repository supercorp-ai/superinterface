import type { OrganizationApiKey, PrismaClient } from '@prisma/client'
import { validate } from 'uuid'

export const getOrganizationApiKey = async ({
  authorization,
  prisma,
}: {
  authorization: string
  prisma: PrismaClient
}): Promise<OrganizationApiKey | null> => {
  const [, organizationApiKeyValue] = authorization.split('Bearer ')

  if (!validate(organizationApiKeyValue)) {
    return null
  }

  return prisma.organizationApiKey.findFirst({
    where: { value: organizationApiKeyValue },
  })
}
