import type { PrismaClient } from '@prisma/client'
import type { TaskScheduler } from './schedulers/types'
import { checkTaskSchedule } from './checkTaskSchedule'
import { scheduleTask } from './scheduleTask'

export type NewTask = {
  title: string
  message: string
  schedule: PrismaJson.TaskSchedule
  threadId: string
  key: string
}

export const createScheduledTask = async ({
  prisma,
  scheduler,
  callbackUrl,
  newTask: { title, message, schedule, threadId, key },
}: {
  prisma: PrismaClient
  scheduler: TaskScheduler
  callbackUrl?: string
  newTask: NewTask
}) => {
  const scheduleCheck = await checkTaskSchedule({
    prisma,
    threadId,
    key,
    schedule,
  })
  if (!scheduleCheck.ok) return scheduleCheck

  const task = await prisma.task.create({
    data: { title, message, schedule, threadId, key },
  })

  await scheduleTask({ task, prisma, scheduler, callbackUrl })

  return { ok: true as const, task }
}
