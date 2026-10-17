import { HandlerType } from '@prisma/client'
import { createTestHandlerFunction } from '../functions/createTestHandlerFunction'

// Gives an assistant the four model-invoked task tools: create_task,
// list_tasks, update_task and delete_task, all sharing `keyTemplate`.
export const createTaskToolFunctions = async ({
  assistantId,
  keyTemplate = '',
}: {
  assistantId: string
  keyTemplate?: string
}) => {
  await createTestHandlerFunction({
    assistantId,
    name: 'create_task',
    type: HandlerType.CREATE_TASK,
    handler: { createTaskHandler: { create: { keyTemplate } } },
  })
  await createTestHandlerFunction({
    assistantId,
    name: 'list_tasks',
    type: HandlerType.LIST_TASKS,
    handler: { listTasksHandler: { create: { keyTemplate } } },
  })
  await createTestHandlerFunction({
    assistantId,
    name: 'update_task',
    type: HandlerType.UPDATE_TASK,
    handler: { updateTaskHandler: { create: { keyTemplate } } },
  })
  await createTestHandlerFunction({
    assistantId,
    name: 'delete_task',
    type: HandlerType.DELETE_TASK,
    handler: { deleteTaskHandler: { create: { keyTemplate } } },
  })
}
