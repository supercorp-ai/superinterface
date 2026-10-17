import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestOrganizationApiKey = async (
  args: Omit<Prisma.OrganizationApiKeyCreateArgs, 'data'> & {
    data: Partial<Prisma.OrganizationApiKeyUncheckedCreateInput> & {
      organizationId: string
    }
  },
) => {
  const { data: overrideData, ...rest } = args
  if (!overrideData.organizationId) {
    throw new Error('organizationId is required')
  }
  return prisma.organizationApiKey.create({
    ...rest,
    data: {
      id: randomUUID(),
      value: randomUUID(),
      name: 'Test Organization Key',
      ...overrideData,
    },
  })
}
