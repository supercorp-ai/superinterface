import type { PrismaClient } from '@prisma/client'
import { workspaceTasksWhere } from '@/lib/tasks/workspaceTasksWhere'
import type { TaskAccess } from './authorizeTaskRequest'

export const findWorkspaceTask = async ({
  prisma,
  access,
}: {
  prisma: PrismaClient
  access: TaskAccess
}) => {
  const task = await prisma.task.findFirst({
    where: {
      id: access.taskId,
      ...workspaceTasksWhere({ workspaceId: access.workspaceId }),
    },
  })

  if (!task) return { ok: false as const, error: 'No task found' }

  return { ok: true as const, task }
}
