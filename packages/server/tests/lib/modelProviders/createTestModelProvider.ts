import { ModelProviderType, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestModelProvider = async (
  args: Omit<Prisma.ModelProviderCreateArgs, 'data'> & {
    data: Partial<Prisma.ModelProviderCreateArgs['data']> & {
      workspaceId: string
    }
  },
) => {
  const { data: overrideData, ...rest } = args
  const { workspaceId, ...restData } = overrideData
  if (!workspaceId) {
    throw new Error('workspaceId is required')
  }
  return prisma.modelProvider.create({
    ...rest,
    data: {
      id: randomUUID(),
      name: 'Test Model Provider',
      type: ModelProviderType.OPENAI,
      apiKey: 'test-api-key',
      workspaceId,
      ...restData,
    },
  })
}
