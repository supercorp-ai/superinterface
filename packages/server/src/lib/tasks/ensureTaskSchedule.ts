import type { PrismaClient } from '@prisma/client'
import { TaskScheduleConflictError } from '@/lib/errors'
import {
  getTaskScheduleConflict,
  TaskScheduleConflictStatus,
} from './getTaskScheduleConflict'

export const ensureTaskSchedule = async ({
  prisma,
  threadId,
  key,
  schedule,
  excludeTaskId,
}: {
  prisma: PrismaClient
  threadId: string
  key: string
  schedule: PrismaJson.TaskSchedule | null | undefined
  excludeTaskId?: string
}) => {
  const taskScheduleConflict = await getTaskScheduleConflict({
    prisma,
    threadId,
    key,
    schedule,
    excludeTaskId,
  })

  if (taskScheduleConflict.status === TaskScheduleConflictStatus.CONFLICT) {
    throw new TaskScheduleConflictError()
  }

  return taskScheduleConflict
}
