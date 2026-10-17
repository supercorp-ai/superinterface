import type { PrismaClient } from '@prisma/client'

const excludeTaskWhere = ({ excludeTaskId }: { excludeTaskId?: string }) => {
  if (!excludeTaskId) return {}

  return { id: { not: excludeTaskId } }
}

// Other tasks on the thread that share the key, with their schedules.
export const findSameKeyTasks = ({
  prisma,
  threadId,
  key,
  excludeTaskId,
}: {
  prisma: PrismaClient
  threadId: string
  key: string
  excludeTaskId?: string
}) =>
  prisma.task.findMany({
    where: {
      threadId,
      key,
      ...excludeTaskWhere({ excludeTaskId }),
    },
    select: {
      id: true,
      schedule: true,
    },
  })
