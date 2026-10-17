import type { Task, PrismaClient } from '@prisma/client'
import { getNextOccurrence } from './getNextOccurrence'
import type { TaskScheduler } from './schedulers/types'
import { defaultTaskCallbackUrl } from './defaultTaskCallbackUrl'
import { publishTaskDelivery } from './publishTaskDelivery'
import { saveTaskDeliveryMessageId } from './saveTaskDeliveryMessageId'

export {
  TASK_DELIVERY_RETRIES,
  TASK_DELIVERY_TIMEOUT,
} from './taskDeliveryLimits'
export { getTaskDeliveryDeduplicationId } from './getTaskDeliveryDeduplicationId'

// Publishes the task's next delivery, if its schedule has one ahead.
export const scheduleTask = async ({
  task,
  prisma,
  scheduler,
  callbackUrl = defaultTaskCallbackUrl(),
}: {
  task: Task
  prisma: PrismaClient
  scheduler: TaskScheduler
  callbackUrl?: string
}) => {
  const nextIso = getNextOccurrence({ schedule: task.schedule })
  if (!nextIso) return

  const { messageId } = await publishTaskDelivery({
    task,
    nextIso,
    scheduler,
    callbackUrl,
  })

  await saveTaskDeliveryMessageId({ task, messageId, prisma, scheduler })
}
