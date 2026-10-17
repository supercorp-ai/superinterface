import type { PrismaClient, Task } from '@prisma/client'
import type { TaskScheduler } from './schedulers/types'
import { cancelScheduledTask } from './cancelScheduledTask'

// existingTask must come from a lookup already scoped to the caller's
// workspace (and task key for task tools); this only removes that record.
export const deleteScheduledTask = async ({
  prisma,
  scheduler,
  existingTask,
}: {
  prisma: PrismaClient
  scheduler: TaskScheduler
  existingTask: Task
}) => {
  await cancelScheduledTask({ task: existingTask, scheduler })

  const task = await prisma.task.delete({ where: { id: existingTask.id } })

  return { ok: true as const, task }
}
