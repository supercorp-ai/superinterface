import type { Task } from '@prisma/client'

export const serializeTask = ({ task }: { task: Task }) => ({
  id: task.id,
  title: task.title,
  message: task.message,
  schedule: task.schedule,
  threadId: task.threadId,
  key: task.key,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
})

export type SerializedTask = ReturnType<typeof serializeTask>
