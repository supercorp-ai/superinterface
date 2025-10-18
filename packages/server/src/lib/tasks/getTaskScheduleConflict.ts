import type { PrismaClient } from '@prisma/client'

import { getScheduleOccurrences } from './getScheduleOccurrences'

export const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000

export enum TaskScheduleConflictStatus {
  NONE = 'none',
  CONFLICT = 'conflict',
}

type ScheduleLike = PrismaJson.TaskSchedule | null | undefined
const LOOKAHEAD_DAYS = 365
const MAX_OCCURRENCES = 120

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
  const targetOccurrences = getScheduleOccurrences(schedule, {
    lookAheadDays: LOOKAHEAD_DAYS,
    maxOccurrences: MAX_OCCURRENCES,
  }).map((occurrence) => occurrence.valueOf())
  if (!targetOccurrences.length) {
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
    const existingOccurrences = getScheduleOccurrences(
      task.schedule as ScheduleLike,
      {
        lookAheadDays: LOOKAHEAD_DAYS,
        maxOccurrences: MAX_OCCURRENCES,
      },
    ).map((occurrence) => occurrence.valueOf())
    if (!existingOccurrences.length) continue

    const hasConflict = targetOccurrences.some((targetMs) =>
      existingOccurrences.some(
        (existingMs) => Math.abs(existingMs - targetMs) < FIFTEEN_MINUTES_IN_MS,
      ),
    )

    if (!hasConflict) continue

    return {
      status: TaskScheduleConflictStatus.CONFLICT as const,
      conflictingTaskId: task.id,
    }
  }

  return { status: TaskScheduleConflictStatus.NONE as const }
}
