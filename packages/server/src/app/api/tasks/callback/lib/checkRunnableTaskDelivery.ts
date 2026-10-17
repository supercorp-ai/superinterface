import type { PrismaClient } from '@prisma/client'
import { checkTaskDelivery } from '@/lib/tasks/checkTaskDelivery'
import { taskRunInclude } from '@/lib/tasks/taskRunInclude'
import type { TaskCallback } from './readTaskCallback'

// Rechecks the delivery once the execution lock is held, loading what the run
// needs.
export const checkRunnableTaskDelivery = async ({
  callback,
  prisma,
}: {
  callback: TaskCallback
  prisma: PrismaClient
}) => {
  const runnableTask = await prisma.task.findUnique({
    where: { id: callback.taskId },
    include: taskRunInclude,
  })

  return checkTaskDelivery({
    task: runnableTask,
    incomingMessageId: callback.incomingMessageId,
    staleReason: 'stale_delivery',
  })
}
