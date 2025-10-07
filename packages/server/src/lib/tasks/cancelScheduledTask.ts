import { qstash } from '@/lib/upstash/qstash'
import { type Task } from '@prisma/client'

export const cancelScheduledTask = async ({ task }: { task: Task }) => {
  if (!task.qstashMessageId) return
  if (process.env.NODE_ENV === 'test') return

  try {
    await qstash.messages.delete(task.qstashMessageId)
  } catch (error) {
    console.error('Failed to cancel scheduled task:', error)
  }
}
