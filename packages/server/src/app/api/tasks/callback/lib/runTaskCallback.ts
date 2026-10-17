import type { TaskCallback } from './readTaskCallback'
import type { TaskCallbackOptions } from './TaskCallbackOptions'
import { checkRunnableTaskDelivery } from './checkRunnableTaskDelivery'
import { executeCallbackTask } from './executeCallbackTask'
import { rescheduleCallbackTask } from './rescheduleCallbackTask'

// Runs a delivered task under its execution lock, then schedules its next
// delivery. Returns the response for the delivery.
export const runTaskCallback = async ({
  callback,
  options: { prisma, scheduler, callbackUrl, taskExecutor },
}: {
  callback: TaskCallback
  options: TaskCallbackOptions
}) => {
  const delivery = await checkRunnableTaskDelivery({ callback, prisma })
  if (delivery.ignoredResponse) return delivery.ignoredResponse

  const { task } = delivery
  const executionResponse = await executeCallbackTask({
    task,
    prisma,
    taskExecutor,
  })

  if (executionResponse) return executionResponse

  return rescheduleCallbackTask({
    callback: { ...callback, taskId: task.id },
    prisma,
    scheduler,
    callbackUrl,
  })
}
