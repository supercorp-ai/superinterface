import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { getWeekCandidates } from './getWeekCandidates'
import { getWeekdayIndexes } from './getWeekdayIndexes'
import { nonEmptyList } from './nonEmptyList'
import type { RuleLimits } from './ruleLimits'
import { getRuleTimes } from './ruleTimes'
import { yieldUntilDayPassesUntil } from './yieldUntilDayPassesUntil'

// Weekly rules walk at most this many interval steps from the start.
const MAX_WEEKS = 1000

export function* generateWeeklyCandidates({
  startLocal,
  rule,
  limits,
  lookAheadEnd,
}: {
  startLocal: Dayjs
  rule: RecurrenceRule
  limits: RuleLimits
  lookAheadEnd: Dayjs
}): Generator<Dayjs> {
  const weekdays = getWeekdayIndexes({ rule, startLocal })
  const times = getRuleTimes({ rule, startLocal })
  const byMonth = nonEmptyList({ list: rule.byMonth })
  const firstWeekStart = startLocal.startOf('week')

  for (let weekIndex = 0; weekIndex < MAX_WEEKS; weekIndex += 1) {
    const weekStart = firstWeekStart.add(weekIndex * limits.interval, 'week')
    if (weekStart.isAfter(lookAheadEnd)) return

    const dayCandidates = getWeekCandidates({
      weekStart,
      weekdays,
      times,
      byMonth,
      startLocal,
    })
    const passedUntil = yield* yieldUntilDayPassesUntil({
      dayCandidates,
      until: limits.until,
    })
    if (passedUntil) return
  }
}
