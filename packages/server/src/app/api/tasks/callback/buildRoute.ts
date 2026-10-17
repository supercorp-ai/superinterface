import { defaultScheduler } from '@/lib/tasks/schedulers/defaultScheduler'
import { defaultTaskExecutionLocker } from '@/lib/tasks/taskExecutionLocker'
import type {
  TaskCallbackOptions,
  TaskCallbackRouteOptions,
} from './lib/TaskCallbackOptions'
import { readTaskCallback } from './lib/readTaskCallback'
import { checkQueuedTaskDelivery } from './lib/checkQueuedTaskDelivery'
import { runTaskCallback } from './lib/runTaskCallback'
import { withQstashSignature } from './lib/withQstashSignature'
import { withTaskExecutionLease } from './lib/withTaskExecutionLease'

export { TASK_EXECUTION_RETRY_AFTER_SECONDS } from './lib/executionInProgressResponse'

// Seconds the host may run the route; a task run can take many minutes.
export const maxDuration = 800

const buildPostHandler =
  (options: TaskCallbackOptions) => async (request: Request) => {
    const callback = await readTaskCallback({ request })
    const queuedDelivery = await checkQueuedTaskDelivery({
      callback,
      prisma: options.prisma,
    })

    if (queuedDelivery.ignoredResponse) return queuedDelivery.ignoredResponse

    return withTaskExecutionLease({
      taskExecutionLocker: options.taskExecutionLocker,
      taskId: callback.taskId,
      run: () => runTaskCallback({ callback, options }),
    })
  }

export const buildPOST = ({
  scheduler = defaultScheduler,
  taskExecutionLocker = defaultTaskExecutionLocker,
  ...options
}: TaskCallbackRouteOptions) =>
  withQstashSignature({
    handler: buildPostHandler({
      ...options,
      scheduler,
      taskExecutionLocker,
    }),
  })
