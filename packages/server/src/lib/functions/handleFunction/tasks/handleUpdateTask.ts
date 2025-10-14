import OpenAI from 'openai'
import {
  UpdateTaskHandler,
  Assistant,
  Thread,
  PrismaClient,
} from '@prisma/client'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { updateTaskSchema } from '@/lib/tasks/schemas'
import { parseTaskToolArgs } from '@/lib/tasks/parseTaskToolArgs'
import { getTaskToolKey } from '@/lib/tasks/getTaskToolKey'
import { scheduleTask } from '@/lib/tasks/scheduleTask'
import { cancelScheduledTask } from '@/lib/tasks/cancelScheduledTask'
import { ensureTaskSchedule } from '@/lib/tasks/ensureTaskSchedule'
import { TaskScheduleConflictError } from '@/lib/errors'

export const handleUpdateTask = async ({
  taskHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  taskHandler: UpdateTaskHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  const parsedArgs = parseTaskToolArgs({ toolCall, assistant, thread, prisma })
  if (!parsedArgs.ok) {
    return { tool_call_id: toolCall.id, output: parsedArgs.error }
  }

  const check = updateTaskSchema.safeParse(parsedArgs.args)
  if (!check.success) {
    return { tool_call_id: toolCall.id, output: check.error.toString() }
  }
  const args = check.data

  const { ok, key, error } = await getTaskToolKey({
    thread,
    assistant,
    keyTemplate: taskHandler.keyTemplate,
    prisma,
  })

  if (!ok) {
    return { tool_call_id: toolCall.id, output: error }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}
  if (args.title !== undefined) {
    updateData.title = args.title
  }
  if (args.message !== undefined) {
    updateData.message = args.message
  }
  if (args.schedule !== undefined) {
    if (!validateSchedule(args.schedule)) {
      return { tool_call_id: toolCall.id, output: 'Invalid schedule.' }
    }
    updateData.schedule = args.schedule
  }
  if (args.key !== undefined) {
    updateData.key = args.key ?? ''
  }

  const existingTask = await prisma.task.findFirst({
    where: {
      id: args.taskId,
      key,
      thread: {
        assistant: {
          workspaceId: assistant.workspaceId,
        },
      },
    },
  })

  if (!existingTask) {
    return { tool_call_id: toolCall.id, output: 'Task not found.' }
  }

  const finalKey = args.key ?? existingTask.key ?? ''
  const finalSchedule = args.schedule ?? existingTask.schedule

  try {
    await ensureTaskSchedule({
      prisma,
      threadId: existingTask.threadId,
      key: finalKey,
      schedule: finalSchedule,
      excludeTaskId: existingTask.id,
    })
  } catch (error) {
    if (error instanceof TaskScheduleConflictError) {
      return {
        tool_call_id: toolCall.id,
        output: error.message,
      }
    }
    throw error
  }

  await cancelScheduledTask({ task: existingTask })

  const task = await prisma.task.update({
    where: {
      id: args.taskId,
      key,
      thread: {
        assistant: {
          workspaceId: assistant.workspaceId,
        },
      },
    },
    data: updateData,
  })

  await scheduleTask({ task, prisma })

  return {
    tool_call_id: toolCall.id,
    output: JSON.stringify({ task: serializeTask({ task }) }),
  }
}
