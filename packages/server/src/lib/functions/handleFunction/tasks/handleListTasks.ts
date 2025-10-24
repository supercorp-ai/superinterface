import OpenAI from 'openai'
import {
  ListTasksHandler,
  Assistant,
  Thread,
  PrismaClient,
} from '@prisma/client'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { listTasksSchema } from '@/lib/tasks/schemas'
import { parseTaskToolArgs } from '@/lib/tasks/parseTaskToolArgs'
import { getTaskToolKey } from '@/lib/tasks/getTaskToolKey'

export const handleListTasks = async ({
  taskHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  taskHandler: ListTasksHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  const parsedArgs = parseTaskToolArgs({ toolCall, assistant, thread, prisma })
  if (!parsedArgs.ok)
    return { tool_call_id: toolCall.id, output: parsedArgs.error }

  const check = listTasksSchema.safeParse(parsedArgs.args)
  if (!check.success)
    return { tool_call_id: toolCall.id, output: check.error.toString() }

  const { ok, key, error } = await getTaskToolKey({
    thread,
    assistant,
    keyTemplate: taskHandler.keyTemplate,
    prisma,
  })
  if (!ok) return { tool_call_id: toolCall.id, output: error }

  const tasks = await prisma.task.findMany({
    where: {
      key,
      thread: {
        assistant: {
          workspaceId: assistant.workspaceId,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    tool_call_id: toolCall.id,
    output: JSON.stringify({
      tasks: tasks.map((t) => serializeTask({ task: t })),
    }),
  }
}
