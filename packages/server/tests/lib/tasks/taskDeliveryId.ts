import { createHash } from 'node:crypto'

// The QStash deduplication id a task delivery should carry: a digest of the
// task revision (id, message, schedule as stored) and the occurrence time.
export const taskDeliveryId = ({
  task,
  nextIso,
}: {
  task: { id: string; message: string; schedule: unknown }
  nextIso: string
}) =>
  `task-${createHash('sha256')
    .update(
      JSON.stringify({
        taskId: task.id,
        message: task.message,
        schedule: task.schedule,
        nextIso,
      }),
    )
    .digest('hex')}`
