import type { Prisma, PrismaClient, Task } from '@prisma/client'
import type { TaskScheduler } from './schedulers/types'
import { checkTaskSchedule } from './checkTaskSchedule'
import { cancelScheduledTask } from './cancelScheduledTask'
import { scheduleTask } from './scheduleTask'

export type TaskChanges = {
  title?: string
  message?: string
  schedule?: PrismaJson.TaskSchedule
  key?: string
}

// existingTask and where must come from a lookup already scoped to the
// caller's workspace (and task key for task tools).
export const updateScheduledTask = async ({
  prisma,
  scheduler,
  callbackUrl,
  existingTask,
  changes,
  where,
}: {
  prisma: PrismaClient
  scheduler: TaskScheduler
  callbackUrl?: string
  existingTask: Task
  changes: TaskChanges
  where: Prisma.TaskWhereUniqueInput
}) => {
  const scheduleCheck = await checkTaskSchedule({
    prisma,
    threadId: existingTask.threadId,
    key: changes.key ?? existingTask.key,
    schedule: changes.schedule ?? existingTask.schedule,
    excludeTaskId: existingTask.id,
  })
  if (!scheduleCheck.ok) return scheduleCheck

  await cancelScheduledTask({ task: existingTask, scheduler })

  const task = await prisma.task.update({ where, data: changes })

  await scheduleTask({ task, prisma, scheduler, callbackUrl })

  return { ok: true as const, task }
}
