import {
  TASK_EXECUTION_LOCK_TTL_SECONDS,
  type TaskExecutionLocker,
} from '@/lib/tasks/taskExecutionLocker'
import { executionInProgressResponse } from './executionInProgressResponse'

// Runs the task while holding its execution lock, or rejects the delivery
// when another one already holds it.
export const withTaskExecutionLease = async <Result>({
  taskExecutionLocker,
  taskId,
  run,
}: {
  taskExecutionLocker: TaskExecutionLocker
  taskId: string
  run: () => Promise<Result>
}) => {
  const executionLease = await taskExecutionLocker.acquire({
    taskId,
    ttlSeconds: TASK_EXECUTION_LOCK_TTL_SECONDS,
  })

  if (!executionLease) return executionInProgressResponse()

  try {
    return await run()
  } finally {
    await executionLease.release()
  }
}
