import type { PrismaClient } from '@prisma/client'
import { workspaceTasksWhere } from '@/lib/tasks/workspaceTasksWhere'

export const findWorkspaceTasks = ({
  prisma,
  workspaceId,
  key,
}: {
  prisma: PrismaClient
  workspaceId: string
  key: string | null
}) =>
  prisma.task.findMany({
    where: {
      ...(key ? { key } : {}),
      ...workspaceTasksWhere({ workspaceId }),
    },
    orderBy: { createdAt: 'desc' },
  })
