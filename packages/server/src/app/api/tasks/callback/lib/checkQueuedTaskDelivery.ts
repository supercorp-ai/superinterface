import type { PrismaClient } from '@prisma/client'
import { checkTaskDelivery } from '@/lib/tasks/checkTaskDelivery'
import type { TaskCallback } from './readTaskCallback'

// Ignores a delivery for a deleted or rescheduled task before taking the
// execution lock.
export const checkQueuedTaskDelivery = async ({
  callback,
  prisma,
}: {
  callback: TaskCallback
  prisma: PrismaClient
}) => {
  const queuedTask = await prisma.task.findUnique({
    where: { id: callback.taskId },
    select: { qstashMessageId: true },
  })

  return checkTaskDelivery({
    task: queuedTask,
    incomingMessageId: callback.incomingMessageId,
    staleReason: 'stale_delivery',
  })
}
