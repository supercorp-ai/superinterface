import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type { PrismaClient } from '@prisma/client'

dayjs.extend(utc)

export const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000

export enum TaskScheduleConflictStatus {
  NONE = 'none',
  CONFLICT = 'conflict',
}

type ScheduleLike = PrismaJson.TaskSchedule | null | undefined

const getScheduleStart = ({ schedule }: { schedule: ScheduleLike }) => {
  if (!schedule || typeof schedule !== 'object') return null
  const start = (schedule as { start?: unknown }).start
  if (typeof start !== 'string') return null
  const parsed = dayjs(start).utc()
  if (!parsed.isValid()) return null
  return parsed
}

export const getTaskScheduleConflict = async ({
  prisma,
  threadId,
  key,
  schedule,
  excludeTaskId,
}: {
  prisma: PrismaClient
  threadId: string
  key: string
  schedule: ScheduleLike
  excludeTaskId?: string
}) => {
  const target = getScheduleStart({ schedule })
  if (!target) {
    return { status: TaskScheduleConflictStatus.NONE as const }
  }

  const tasks = await prisma.task.findMany({
    where: {
      threadId,
      key,
      ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
    },
    select: {
      id: true,
      schedule: true,
    },
  })

  for (const task of tasks) {
    const existing = getScheduleStart({
      schedule: task.schedule as ScheduleLike,
    })
    if (!existing) continue
    const diffMs = Math.abs(existing.diff(target))
    if (diffMs < FIFTEEN_MINUTES_IN_MS) {
      return {
        status: TaskScheduleConflictStatus.CONFLICT as const,
        conflictingTaskId: task.id,
      }
    }
  }

  return { status: TaskScheduleConflictStatus.NONE as const }
}
