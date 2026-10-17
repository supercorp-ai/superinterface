import { HandlerType } from '@prisma/client'
import { handleRequest } from '../handleRequest'
import { handleFirecrawl } from '../handleFirecrawl'
import { handleReplicate } from '../handleReplicate'
import { handleAssistant } from '../handleAssistant'
import { handleClientTool } from '../handleClientTool'
import { handleCreateTask } from '../tasks/handleCreateTask'
import { handleListTasks } from '../tasks/handleListTasks'
import { handleUpdateTask } from '../tasks/handleUpdateTask'
import { handleDeleteTask } from '../tasks/handleDeleteTask'
import type { FunctionCall, FunctionHandler, FunctionOutput } from '../types'

type FunctionHandlerEntry = {
  // Names the handler in the error logged when its row is missing.
  label: string
  // Runs the handler, or yields its missing (null) row.
  handle: ({
    handler,
    call,
  }: {
    handler: FunctionHandler
    call: FunctionCall
  }) => Promise<FunctionOutput> | null
}

// The handler for each function handler type. Every handler picks what it
// needs from the call.
export const functionHandlers: Record<HandlerType, FunctionHandlerEntry> = {
  [HandlerType.REQUEST]: {
    label: 'request',
    handle: ({ handler: { requestHandler }, call }) =>
      requestHandler && handleRequest({ requestHandler, ...call }),
  },
  [HandlerType.CLIENT_TOOL]: {
    label: 'client tool',
    handle: ({ handler: { clientToolHandler }, call }) =>
      clientToolHandler && handleClientTool({ clientToolHandler, ...call }),
  },
  [HandlerType.FIRECRAWL]: {
    label: 'Firecrawl',
    handle: ({ handler: { firecrawlHandler }, call }) =>
      firecrawlHandler && handleFirecrawl({ firecrawlHandler, ...call }),
  },
  [HandlerType.REPLICATE]: {
    label: 'Replicate',
    handle: ({ handler: { replicateHandler }, call }) =>
      replicateHandler && handleReplicate({ replicateHandler, ...call }),
  },
  [HandlerType.ASSISTANT]: {
    label: 'assistant',
    handle: ({ handler: { assistantHandler }, call }) =>
      assistantHandler && handleAssistant({ assistantHandler, ...call }),
  },
  [HandlerType.CREATE_TASK]: {
    label: 'task',
    handle: ({ handler: { createTaskHandler }, call }) =>
      createTaskHandler &&
      handleCreateTask({ taskHandler: createTaskHandler, ...call }),
  },
  [HandlerType.LIST_TASKS]: {
    label: 'task',
    handle: ({ handler: { listTasksHandler }, call }) =>
      listTasksHandler &&
      handleListTasks({ taskHandler: listTasksHandler, ...call }),
  },
  [HandlerType.UPDATE_TASK]: {
    label: 'task',
    handle: ({ handler: { updateTaskHandler }, call }) =>
      updateTaskHandler &&
      handleUpdateTask({ taskHandler: updateTaskHandler, ...call }),
  },
  [HandlerType.DELETE_TASK]: {
    label: 'task',
    handle: ({ handler: { deleteTaskHandler }, call }) =>
      deleteTaskHandler &&
      handleDeleteTask({ taskHandler: deleteTaskHandler, ...call }),
  },
}
