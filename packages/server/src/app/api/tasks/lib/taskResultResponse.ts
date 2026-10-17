import type { TaskResult } from '@/lib/tasks/TaskResult'
import { taskErrorResponse } from './taskErrorResponse'
import { taskResponse } from './taskResponse'

export const taskResultResponse = ({ result }: { result: TaskResult }) => {
  if (!result.ok) return taskErrorResponse(result)

  return taskResponse({ task: result.task })
}
