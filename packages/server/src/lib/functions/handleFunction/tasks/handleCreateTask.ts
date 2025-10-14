import OpenAI from 'openai'
import {
  CreateTaskHandler,
  Assistant,
  Thread,
  PrismaClient,
} from '@prisma/client'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { createTaskToolSchema } from '@/lib/tasks/schemas'
import { parseTaskToolArgs } from '@/lib/tasks/parseTaskToolArgs'
import { getTaskToolKey } from '@/lib/tasks/getTaskToolKey'
import { scheduleTask } from '@/lib/tasks/scheduleTask'
import { ensureTaskSchedule } from '@/lib/tasks/ensureTaskSchedule'
import { TaskScheduleConflictError } from '@/lib/errors'

export const handleCreateTask = async ({
  taskHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  taskHandler: CreateTaskHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  const parsedArgs = parseTaskToolArgs({ toolCall, assistant, thread, prisma })
  if (!parsedArgs.ok) {
    return { tool_call_id: toolCall.id, output: parsedArgs.error }
  }

  const check = createTaskToolSchema.safeParse(parsedArgs.args)
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

  if (!validateSchedule(args.schedule)) {
    return { tool_call_id: toolCall.id, output: 'Invalid schedule.' }
  }
  const taskKey = key ?? ''

  try {
    await ensureTaskSchedule({
      prisma,
      threadId: thread.id,
      key: taskKey,
      schedule: args.schedule,
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

  const task = await prisma.task.create({
    data: {
      title: args.title,
      message: args.message,
      schedule: args.schedule,
      threadId: thread.id,
      key: taskKey,
    },
  })

  await scheduleTask({ task, prisma })

  return {
    tool_call_id: toolCall.id,
    output: JSON.stringify({ task: serializeTask({ task }) }),
  }
}
