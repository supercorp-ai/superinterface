import type { DeleteTaskHandler } from '@prisma/client'
import { deleteTaskSchema } from '@/lib/tasks/schemas'
import {
  parseTaskToolCall,
  type TaskToolCallContext,
} from '@/lib/tasks/parseTaskToolCall'
import { findTaskToolTask } from '@/lib/tasks/findTaskToolTask'
import { deleteScheduledTask } from '@/lib/tasks/deleteScheduledTask'
import { taskToolOutput } from '@/lib/tasks/taskToolOutput'
import { taskToolResult } from '@/lib/tasks/taskToolResult'
import { defaultScheduler } from '@/lib/tasks/schedulers/defaultScheduler'

export const handleDeleteTask = async ({
  taskHandler,
  ...context
}: TaskToolCallContext & { taskHandler: DeleteTaskHandler }) => {
  const { toolCall, assistant, prisma } = context

  const call = await parseTaskToolCall({
    context,
    keyTemplate: taskHandler.keyTemplate,
    schema: deleteTaskSchema,
  })
  if (!call.ok) return taskToolOutput({ toolCall, output: call.error })

  const existing = await findTaskToolTask({
    prisma,
    taskId: call.args.taskId,
    key: call.key,
    workspaceId: assistant.workspaceId,
  })
  if (!existing.ok) return taskToolResult({ toolCall, result: existing })

  const result = await deleteScheduledTask({
    prisma,
    scheduler: defaultScheduler,
    existingTask: existing.task,
  })

  return taskToolResult({ toolCall, result })
}
