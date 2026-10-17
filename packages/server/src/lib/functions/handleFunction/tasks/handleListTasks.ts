import type { ListTasksHandler } from '@prisma/client'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { listTasksSchema } from '@/lib/tasks/schemas'
import {
  parseTaskToolCall,
  type TaskToolCallContext,
} from '@/lib/tasks/parseTaskToolCall'
import { taskToolWhere } from '@/lib/tasks/taskToolWhere'
import { taskToolOutput } from '@/lib/tasks/taskToolOutput'

export const handleListTasks = async ({
  taskHandler,
  ...context
}: TaskToolCallContext & { taskHandler: ListTasksHandler }) => {
  const { toolCall, assistant, prisma } = context

  const call = await parseTaskToolCall({
    context,
    keyTemplate: taskHandler.keyTemplate,
    schema: listTasksSchema,
  })
  if (!call.ok) return taskToolOutput({ toolCall, output: call.error })

  const tasks = await prisma.task.findMany({
    where: taskToolWhere({ key: call.key, workspaceId: assistant.workspaceId }),
    orderBy: { createdAt: 'desc' },
  })

  return taskToolOutput({
    toolCall,
    output: JSON.stringify({
      tasks: tasks.map((task) => serializeTask({ task })),
    }),
  })
}
