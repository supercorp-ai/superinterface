import type { NextResponse } from 'next/server'
import { isStaleDelivery } from '@/lib/tasks/isStaleDelivery'
import { ignoredDeliveryResponse } from '@/lib/tasks/ignoredDeliveryResponse'

type TaskDelivery<Task> =
  | { task: Task; ignoredResponse: null }
  | { ignoredResponse: NextResponse }

// Ignores a delivery whose task was deleted or rescheduled since it was sent.
export const checkTaskDelivery = <
  Task extends { qstashMessageId: string | null },
>({
  task,
  incomingMessageId,
  staleReason,
}: {
  task: Task | null
  incomingMessageId: string | null
  staleReason: 'stale_delivery' | 'task_changed'
}): TaskDelivery<Task> => {
  if (!task) {
    return {
      ignoredResponse: ignoredDeliveryResponse({ reason: 'task_deleted' }),
    }
  }

  if (
    isStaleDelivery({
      incomingMessageId,
      currentMessageId: task.qstashMessageId,
    })
  ) {
    return { ignoredResponse: ignoredDeliveryResponse({ reason: staleReason }) }
  }

  return { task, ignoredResponse: null }
}
