import type { Dayjs } from 'dayjs'
import type { DayCandidate } from './getWeekCandidates'
import { isAfterUntil } from './isAfterUntil'

// Yields the candidates in order and returns true once one falls on a day
// after `until`, which ends the whole rule.
export function* yieldUntilDayPassesUntil({
  dayCandidates,
  until,
}: {
  dayCandidates: DayCandidate[]
  until: Dayjs | null
}): Generator<Dayjs, boolean> {
  for (const { day, candidate } of dayCandidates) {
    if (isAfterUntil({ moment: day, until })) return true
    yield candidate
  }

  return false
}
