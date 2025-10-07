import OpenAI from 'openai'
import { UpdateTaskHandler, Assistant, Thread } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { updateTaskSchema } from '@/lib/tasks/schemas'
import { parseTaskToolArgs } from '@/lib/tasks/parseTaskToolArgs'
import { getTaskToolKey } from '@/lib/tasks/getTaskToolKey'
import { scheduleTask } from '@/lib/tasks/scheduleTask'

export const handleUpdateTask = async ({
  taskHandler,
  toolCall,
  assistant,
  thread,
}: {
  taskHandler: UpdateTaskHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
}) => {
  const parsedArgs = parseTaskToolArgs({ toolCall, assistant, thread })
  if (!parsedArgs.ok)
    return { tool_call_id: toolCall.id, output: parsedArgs.error }

  const check = updateTaskSchema.safeParse(parsedArgs.args)
  if (!check.success)
    return { tool_call_id: toolCall.id, output: check.error.toString() }
  const args = check.data

  const { ok, key, error } = await getTaskToolKey({
    thread,
    assistant,
    keyTemplate: taskHandler.keyTemplate,
  })

  if (!ok) return { tool_call_id: toolCall.id, output: error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}
  if (args.title !== undefined) updateData.title = args.title
  if (args.message !== undefined) updateData.message = args.message
  if (args.schedule !== undefined) {
    if (!validateSchedule(args.schedule)) {
      return { tool_call_id: toolCall.id, output: 'Invalid schedule.' }
    }
    updateData.schedule = args.schedule
  }
  if (args.key !== undefined) updateData.key = args.key ?? ''

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

  await scheduleTask({ task })

  return {
    tool_call_id: toolCall.id,
    output: JSON.stringify({ task: serializeTask({ task }) }),
  }
}
