import type { PrismaClient } from '@prisma/client'
import { taskToolWhere } from './taskToolWhere'

export const findTaskToolTask = async ({
  prisma,
  taskId,
  key,
  workspaceId,
}: {
  prisma: PrismaClient
  taskId: string
  key: string
  workspaceId: string
}) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...taskToolWhere({ key, workspaceId }) },
  })

  if (!task) return { ok: false as const, error: 'Task not found.' }

  return { ok: true as const, task }
}
