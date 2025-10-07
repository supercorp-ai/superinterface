import { scheduleSchema } from './scheduleSchema'
import { getNextOccurrence } from './getNextOccurrence'

export const validateSchedule = (
  schedule: PrismaJson.TaskSchedule,
): boolean => {
  const parsed = scheduleSchema.safeParse(schedule)
  if (!parsed.success) return false
  try {
    const next = getNextOccurrence({ schedule })
    if (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray((schedule as any).recurrenceRules) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schedule as any).recurrenceRules.length
    ) {
      return next !== null
    }
    return true
  } catch {
    return false
  }
}
