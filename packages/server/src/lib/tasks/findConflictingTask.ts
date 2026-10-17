import type { PrismaClient } from '@prisma/client'
import { findSameKeyTasks } from './findSameKeyTasks'
import { getConflictCheckTimes } from './getConflictCheckTimes'
import { timesOverlap } from './timesOverlap'

// The first other task with the same thread and key whose upcoming
// occurrences fall within the conflict window of the schedule's.
export const findConflictingTask = async ({
  schedule,
  ...sameKeyTasksWhere
}: {
  prisma: PrismaClient
  threadId: string
  key: string
  schedule: PrismaJson.TaskSchedule | null | undefined
  excludeTaskId?: string
}) => {
  const targetTimes = getConflictCheckTimes({ schedule })
  if (!targetTimes.length) return undefined

  const tasks = await findSameKeyTasks(sameKeyTasksWhere)

  return tasks.find((task) =>
    timesOverlap({
      targetTimes,
      existingTimes: getConflictCheckTimes({ schedule: task.schedule }),
    }),
  )
}
