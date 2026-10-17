import type { Prisma } from '@prisma/client'
import { assistantRunInclude } from '@/lib/assistants/assistantRunInclude'

export const taskRunInclude = {
  thread: {
    include: {
      assistant: {
        include: assistantRunInclude,
      },
    },
  },
} satisfies Prisma.TaskInclude
