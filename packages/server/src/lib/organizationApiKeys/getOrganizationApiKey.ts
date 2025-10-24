import type { OrganizationApiKey, PrismaClient } from '@prisma/client'
import { validate } from 'uuid'

export const getOrganizationApiKey = async ({
  authorization,
  prisma,
}: {
  authorization: string | null
  prisma: PrismaClient
}): Promise<OrganizationApiKey | null> => {
  if (!authorization) {
    return null
  }

  const [, organizationApiKeyValue] = authorization.split('Bearer ')

  if (!validate(organizationApiKeyValue)) {
    return null
  }

  return prisma.organizationApiKey.findFirst({
    where: { value: organizationApiKeyValue },
  })
}
