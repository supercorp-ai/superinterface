import { createHash } from 'node:crypto'
import type { Task } from '@prisma/client'

// Identifies one delivery of one version of a task, so QStash drops repeated
// publishes of the same occurrence.
export const getTaskDeliveryDeduplicationId = ({
  task,
  nextIso,
}: {
  task: Task
  nextIso: string
}) => {
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        taskId: task.id,
        message: task.message,
        schedule: task.schedule,
        nextIso,
      }),
    )
    .digest('hex')

  return `task-${digest}`
}
