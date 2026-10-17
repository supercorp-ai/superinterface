import type { CreateTaskHandler } from '@prisma/client'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { createTaskToolSchema } from '@/lib/tasks/schemas'
import {
  parseTaskToolCall,
  type TaskToolCallContext,
} from '@/lib/tasks/parseTaskToolCall'
import { createScheduledTask } from '@/lib/tasks/createScheduledTask'
import { taskToolOutput } from '@/lib/tasks/taskToolOutput'
import { taskToolResult } from '@/lib/tasks/taskToolResult'
import { defaultScheduler } from '@/lib/tasks/schedulers/defaultScheduler'

export const handleCreateTask = async ({
  taskHandler,
  ...context
}: TaskToolCallContext & { taskHandler: CreateTaskHandler }) => {
  const { toolCall, thread, prisma } = context

  const call = await parseTaskToolCall({
    context,
    keyTemplate: taskHandler.keyTemplate,
    schema: createTaskToolSchema,
  })
  if (!call.ok) return taskToolOutput({ toolCall, output: call.error })

  if (!validateSchedule(call.args.schedule)) {
    return taskToolOutput({ toolCall, output: 'Invalid schedule.' })
  }

  const result = await createScheduledTask({
    prisma,
    scheduler: defaultScheduler,
    newTask: {
      title: call.args.title,
      message: call.args.message,
      schedule: call.args.schedule,
      threadId: thread.id,
      key: call.key,
    },
  })

  return taskToolResult({ toolCall, result })
}
