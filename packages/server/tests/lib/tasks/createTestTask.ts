import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestTask = async (
  args: Omit<Prisma.TaskCreateArgs, 'data'> & {
    data: Partial<Prisma.TaskCreateArgs['data']> & { threadId: string }
  },
) => {
  if (!args.data.threadId) {
    throw new Error('threadId is required')
  }
  return prisma.task.create({
    ...args,
    data: {
      id: randomUUID(),
      title: 'Test Task',
      message: 'Test message',
      schedule: {
        start: new Date().toISOString(),
      },
      key: '',
      qstashMessageId: null,
      ...(args.data ?? {}),
    },
  })
}
