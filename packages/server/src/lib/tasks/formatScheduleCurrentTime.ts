// Registers the dayjs utc and timezone plugins.
import { dayjs } from './occurrences/dayjsWithTimeZone'

// The current time in the schedule's time zone, for errors telling the model
// what "now" is.
export const formatScheduleCurrentTime = ({
  schedule,
}: {
  schedule: PrismaJson.TaskSchedule
}) => {
  if (schedule.timeZone) {
    return `${dayjs().tz(schedule.timeZone).format()} in timezone ${schedule.timeZone}`
  }

  return `${dayjs().toISOString()} in UTC`
}
