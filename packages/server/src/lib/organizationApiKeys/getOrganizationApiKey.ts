import type { OrganizationApiKey } from '@prisma/client'
import { validate } from 'uuid'
import { prisma } from '@/lib/prisma'

export const getOrganizationApiKey = async ({
  authorization,
}: {
  authorization: string | null
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
