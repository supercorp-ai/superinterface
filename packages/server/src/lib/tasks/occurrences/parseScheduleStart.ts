import { dayjs } from './dayjsWithTimeZone'

const UTC_OFFSET_SUFFIX = /([+-]\d\d:\d\d|Z)$/i

// A start with an offset keeps its instant; one without is read as wall-clock
// time in the schedule time zone.
export const parseScheduleStart = ({
  start,
  timeZone,
}: {
  start: string
  timeZone: string
}) => {
  if (!dayjs(start).isValid()) return null
  if (UTC_OFFSET_SUFFIX.test(start)) return dayjs(start).tz(timeZone)

  return dayjs.tz(start, timeZone)
}
