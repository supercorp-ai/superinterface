import { TaskScheduleConflictError } from '@/lib/errors'
import { ensureTaskSchedule } from './ensureTaskSchedule'

export const checkTaskSchedule = async (
  args: Parameters<typeof ensureTaskSchedule>[0],
) => {
  try {
    await ensureTaskSchedule(args)
  } catch (error) {
    if (error instanceof TaskScheduleConflictError) {
      return { ok: false as const, error: error.message }
    }
    throw error
  }

  return { ok: true as const }
}
