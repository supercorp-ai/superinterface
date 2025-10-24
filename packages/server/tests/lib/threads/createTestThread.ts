import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestThread = async (
  args: Omit<Prisma.ThreadCreateArgs, 'data'> & {
    data: Partial<Prisma.ThreadCreateArgs['data']> & { assistantId: string }
  },
) => {
  if (!args.data.assistantId) {
    throw new Error('assistantId is required')
  }
  return prisma.thread.create({
    ...args,
    data: {
      id: randomUUID(),
      metadata: {},
      ...(args.data ?? {}),
    },
  })
}
