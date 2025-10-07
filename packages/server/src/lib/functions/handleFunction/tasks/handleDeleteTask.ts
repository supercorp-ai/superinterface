import OpenAI from 'openai'
import { DeleteTaskHandler, Assistant, Thread } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { deleteTaskSchema } from '@/lib/tasks/schemas'
import { parseTaskToolArgs } from '@/lib/tasks/parseTaskToolArgs'
import { getTaskToolKey } from '@/lib/tasks/getTaskToolKey'
import { cancelScheduledTask } from '@/lib/tasks/cancelScheduledTask'

export const handleDeleteTask = async ({
  taskHandler,
  toolCall,
  assistant,
  thread,
}: {
  taskHandler: DeleteTaskHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
}) => {
  const parsedArgs = parseTaskToolArgs({ toolCall, assistant, thread })
  if (!parsedArgs.ok)
    return { tool_call_id: toolCall.id, output: parsedArgs.error }

  const check = deleteTaskSchema.safeParse(parsedArgs.args)
  if (!check.success)
    return { tool_call_id: toolCall.id, output: check.error.toString() }
  const args = check.data

  const { ok, key, error } = await getTaskToolKey({
    thread,
    assistant,
    keyTemplate: taskHandler.keyTemplate,
  })

  if (!ok) return { tool_call_id: toolCall.id, output: error }

  const existing = await prisma.task.findFirst({
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

  if (!existing) {
    return { tool_call_id: toolCall.id, output: 'Task not found.' }
  }

  await cancelScheduledTask({ task: existing })

  const task = await prisma.task.delete({ where: { id: args.taskId } })

  return {
    tool_call_id: toolCall.id,
    output: JSON.stringify({ task: serializeTask({ task }) }),
  }
}
