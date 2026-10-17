import type { Dayjs } from 'dayjs'
import { dayjs } from './dayjsWithTimeZone'

// Occurrences up to this long ago still count, so a task that has just
// started is still compared against.
const LOOKBACK_MINUTES = 15

export type OccurrenceWindow = {
  earliestAllowed: Dayjs
  lookAheadEnd: Dayjs
}

export const getOccurrenceWindow = ({
  timeZone,
  lookAheadDays,
}: {
  timeZone: string
  lookAheadDays: number
}): OccurrenceWindow => {
  const nowLocal = dayjs().tz(timeZone)

  return {
    earliestAllowed: nowLocal.subtract(LOOKBACK_MINUTES, 'minute'),
    lookAheadEnd: nowLocal.add(lookAheadDays, 'day'),
  }
}
