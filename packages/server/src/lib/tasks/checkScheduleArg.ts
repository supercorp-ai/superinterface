import { scheduleSchema } from './scheduleSchema'
import { getNextOccurrence } from './getNextOccurrence'
import { formatScheduleCurrentTime } from './formatScheduleCurrentTime'
import type { TaskToolArgsCheck } from './TaskToolArgsCheck'

// A task tool schedule must be well formed and still have an occurrence
// ahead.
export const checkScheduleArg = ({
  scheduleArg,
}: {
  scheduleArg: unknown
}): TaskToolArgsCheck<PrismaJson.TaskSchedule> => {
  const parsed = scheduleSchema.safeParse(scheduleArg)
  if (!parsed.success) {
    return {
      ok: false,
      logMessage: 'Invalid schedule provided.',
      error: parsed.error.toString(),
    }
  }

  const schedule = scheduleArg as PrismaJson.TaskSchedule
  if (getNextOccurrence({ schedule })) return { ok: true, value: schedule }

  const message = `Schedule must be in the future. Current time: ${formatScheduleCurrentTime({ schedule })}`

  return { ok: false, logMessage: message, error: message }
}
