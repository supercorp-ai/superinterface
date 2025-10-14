import { Prisma, StorageProviderType } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestAssistant = async (
  args: Omit<Prisma.AssistantCreateArgs, 'data'> & {
    data: Partial<Prisma.AssistantCreateArgs['data']> & {
      workspaceId: string
      modelProviderId: string
    }
  },
) => {
  const { data: overrideData, ...rest } = args
  const { workspaceId, modelProviderId, ...restData } = overrideData
  if (!workspaceId) throw new Error('workspaceId is required')
  if (!modelProviderId) throw new Error('modelProviderId is required')

  return prisma.assistant.create({
    ...rest,
    data: {
      id: randomUUID(),
      name: 'Test Assistant',
      workspaceId,
      modelProviderId,
      modelSlug: 'gpt-3.5-turbo',
      storageProviderType: StorageProviderType.OPENAI,
      ...restData,
    },
  })
}
