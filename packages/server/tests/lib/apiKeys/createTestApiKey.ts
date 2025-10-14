import { ApiKeyType, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestApiKey = async (
  args: Omit<Prisma.ApiKeyCreateArgs, 'data'> & {
    data: Partial<Prisma.ApiKeyCreateArgs['data']> & { workspaceId: string }
  },
) => {
  if (!args.data.workspaceId) {
    throw new Error('workspaceId is required')
  }
  return prisma.apiKey.create({
    ...args,
    data: {
      id: randomUUID(),
      type: ApiKeyType.PRIVATE,
      value: randomUUID(),
      name: 'Test Key',
      ...(args.data ?? {}),
    },
  })
}
