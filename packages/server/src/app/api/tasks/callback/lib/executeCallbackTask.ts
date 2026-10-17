import type { Prisma, PrismaClient } from '@prisma/client'
import { runTaskThread } from '@/lib/tasks/runTaskThread'
import type { taskRunInclude } from '@/lib/tasks/taskRunInclude'
import type { TaskExecutor } from './TaskCallbackOptions'

// Hands the task to the host's executor when one is configured, and runs it
// on its thread otherwise.
export const executeCallbackTask = ({
  task,
  prisma,
  taskExecutor,
}: {
  task: Prisma.TaskGetPayload<{ include: typeof taskRunInclude }>
  prisma: PrismaClient
  taskExecutor?: TaskExecutor
}) => {
  if (taskExecutor) return taskExecutor({ taskId: task.id })

  return runTaskThread({ task, prisma })
}
