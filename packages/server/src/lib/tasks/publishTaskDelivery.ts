import type { Task } from '@prisma/client'
import type { TaskScheduler } from './schedulers/types'
import { getTaskDeliveryDelay } from './getTaskDeliveryDelay'
import { getTaskDeliveryDeduplicationId } from './getTaskDeliveryDeduplicationId'
import {
  TASK_DELIVERY_RETRIES,
  TASK_DELIVERY_TIMEOUT,
} from './taskDeliveryLimits'

// Publishes the callback that delivers the task at its next occurrence.
// callbackUrl is the host's own callback route, set in its configuration.
export const publishTaskDelivery = ({
  task,
  nextIso,
  scheduler,
  callbackUrl,
}: {
  task: Task
  nextIso: string
  scheduler: TaskScheduler
  callbackUrl: string
}) =>
  scheduler.publishJSON({
    url: callbackUrl,
    body: { taskId: task.id },
    delay: getTaskDeliveryDelay({ nextIso }),
    deduplicationId: getTaskDeliveryDeduplicationId({ task, nextIso }),
    retries: TASK_DELIVERY_RETRIES,
    timeout: TASK_DELIVERY_TIMEOUT,
  })
