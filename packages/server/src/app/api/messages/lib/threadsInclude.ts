import type { Prisma } from '@prisma/client'
import { validThreadId } from '@/lib/threads/validThreadId'

// The requested thread, if it belongs to the assistant, with the storage
// provider type its storage thread id is read by.
export const threadsInclude = ({ threadId }: { threadId: string | null }) =>
  ({
    where: {
      id: validThreadId({ threadId }),
    },
    take: 1,
    include: {
      assistant: {
        select: {
          storageProviderType: true,
        },
      },
    },
  }) satisfies Prisma.Assistant$threadsArgs
