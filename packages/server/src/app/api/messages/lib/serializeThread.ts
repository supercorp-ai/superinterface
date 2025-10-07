import { Prisma } from '@prisma/client'
import dayjs from 'dayjs'
import { storageThreadId } from '@/lib/threads/storageThreadId'

export const serializeThread = ({
  thread,
}: {
  thread: Prisma.ThreadGetPayload<{
    include: {
      assistant: {
        select: {
          storageProviderType: true
        }
      }
    }
  }>
}) => ({
  id: storageThreadId({ thread }),
  object: 'thread',
  created_at: dayjs(thread.createdAt).unix(),
  metadata: thread.metadata,
})
