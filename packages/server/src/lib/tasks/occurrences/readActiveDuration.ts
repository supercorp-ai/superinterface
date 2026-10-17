import type { Duration } from 'dayjs/plugin/duration'
import duration from 'dayjs/plugin/duration'
import { dayjs } from './dayjsWithTimeZone'

type TaskSchedule = PrismaJson.TaskSchedule

dayjs.extend(duration)

// How long a continuous schedule stays active after its start, read from its
// ISO 8601 `duration`.
export const readActiveDuration = ({
  schedule,
}: {
  schedule: TaskSchedule
}): Duration | null => {
  if (typeof schedule.duration !== 'string') return null

  return dayjs.duration(schedule.duration)
}
