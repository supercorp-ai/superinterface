import type { UpdateTaskHandler } from '@prisma/client'
import { updateTaskSchema } from '@/lib/tasks/schemas'
import {
  parseTaskToolCall,
  type TaskToolCallContext,
} from '@/lib/tasks/parseTaskToolCall'
import { findTaskToolTask } from '@/lib/tasks/findTaskToolTask'
import { taskToolWhere } from '@/lib/tasks/taskToolWhere'
import { updateScheduledTask } from '@/lib/tasks/updateScheduledTask'
import { taskToolOutput } from '@/lib/tasks/taskToolOutput'
import { taskToolResult } from '@/lib/tasks/taskToolResult'
import { defaultScheduler } from '@/lib/tasks/schedulers/defaultScheduler'

export const handleUpdateTask = async ({
  taskHandler,
  ...context
}: TaskToolCallContext & { taskHandler: UpdateTaskHandler }) => {
  const { toolCall, assistant, prisma } = context

  const call = await parseTaskToolCall({
    context,
    keyTemplate: taskHandler.keyTemplate,
    schema: updateTaskSchema,
  })
  if (!call.ok) return taskToolOutput({ toolCall, output: call.error })

  // parseTaskToolArgs already rejected schedules that are invalid or have no
  // future occurrence.
  const { taskId, ...changes } = call.args
  const scope = { key: call.key, workspaceId: assistant.workspaceId }

  const existing = await findTaskToolTask({ prisma, taskId, ...scope })
  if (!existing.ok) return taskToolResult({ toolCall, result: existing })

  const result = await updateScheduledTask({
    prisma,
    scheduler: defaultScheduler,
    existingTask: existing.task,
    changes,
    where: { id: taskId, ...taskToolWhere(scope) },
  })

  return taskToolResult({ toolCall, result })
}
