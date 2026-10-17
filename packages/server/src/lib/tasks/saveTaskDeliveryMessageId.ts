import type { PrismaClient, Task } from '@prisma/client'
import type { TaskScheduler } from './schedulers/types'
import { isRecordNotFoundError } from './isRecordNotFoundError'

// Records the published delivery on the task. When the task was deleted
// while the callback was in flight (e.g. continuous mode toggled off), the
// delivery is cancelled instead.
export const saveTaskDeliveryMessageId = async ({
  task,
  messageId,
  prisma,
  scheduler,
}: {
  task: Task
  messageId: string
  prisma: PrismaClient
  scheduler: TaskScheduler
}) => {
  try {
    await prisma.task.update({
      where: { id: task.id },
      data: { qstashMessageId: messageId },
    })
  } catch (error: unknown) {
    if (!isRecordNotFoundError({ error })) throw error

    await scheduler.messages.delete(messageId)
  }
}
