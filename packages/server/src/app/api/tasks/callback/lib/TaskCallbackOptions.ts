import type { PrismaClient } from '@prisma/client'
import type { TaskScheduler } from '@/lib/tasks/schedulers/types'
import type { TaskExecutionLocker } from '@/lib/tasks/taskExecutionLocker'

export type TaskExecutor = ({
  taskId,
}: {
  taskId: string
}) => Promise<Response | null>

// Options a host passes to buildPOST; omitted ones fall back to defaults.
export type TaskCallbackRouteOptions = {
  prisma: PrismaClient
  scheduler?: TaskScheduler
  callbackUrl?: string
  taskExecutionLocker?: TaskExecutionLocker
  taskExecutor?: TaskExecutor
}

// Route options once the defaults have been applied.
export type TaskCallbackOptions = TaskCallbackRouteOptions & {
  scheduler: TaskScheduler
  taskExecutionLocker: TaskExecutionLocker
}
