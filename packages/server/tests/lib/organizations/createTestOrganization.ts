import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestOrganization = async (
  args: Omit<Prisma.OrganizationCreateArgs, 'data'> & {
    data?: Partial<Prisma.OrganizationCreateArgs['data']>
  } = {},
) => {
  const { data: overrideData, ...rest } = args
  return prisma.organization.create({
    ...rest,
    data: {
      id: randomUUID(),
      name: 'Test Organization',
      ...(overrideData ?? {}),
    },
  })
}
