import type { RecurrenceRule } from '@/types'

type TaskSchedule = PrismaJson.TaskSchedule

export const DEFAULT_TIME_ZONE = 'UTC'

export type ScheduleFields = {
  start: string
  timeZone: string
  recurrenceRules: RecurrenceRule[]
}

export const readScheduleFields = ({
  schedule,
}: {
  schedule: TaskSchedule | null | undefined
}): ScheduleFields | null => {
  if (!schedule || typeof schedule !== 'object') return null

  const {
    start,
    timeZone = DEFAULT_TIME_ZONE,
    recurrenceRules = [],
  } = schedule as Partial<TaskSchedule>
  if (typeof start !== 'string') return null

  return { start, timeZone, recurrenceRules }
}
