import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { getStepCandidates } from './getStepCandidates'
import { isAfterUntil } from './isAfterUntil'
import { isBeforeStart } from './isBeforeStart'
import { isInAllowedMonth } from './isInAllowedMonth'
import { nonEmptyList } from './nonEmptyList'
import type { RuleLimits } from './ruleLimits'
import { getRuleTimes } from './ruleTimes'

export type SeriesUnit = 'day' | 'hour' | 'minute' | 'month' | 'year'

// Simple series walk at most this many interval steps from the start.
const MAX_STEPS = 5000

export function* generateSeriesCandidates({
  startLocal,
  rule,
  unit,
  limits,
}: {
  startLocal: Dayjs
  rule: RecurrenceRule
  unit: SeriesUnit
  limits: RuleLimits
}): Generator<Dayjs> {
  const times = getRuleTimes({ rule, startLocal })
  const byMonth = nonEmptyList({ list: rule.byMonth })
  const byDay = nonEmptyList({ list: rule.byDay })

  for (let stepIndex = 0; stepIndex < MAX_STEPS; stepIndex += 1) {
    const step = startLocal.add(stepIndex * limits.interval, unit)

    if (isBeforeStart({ moment: step, startLocal })) continue
    if (isAfterUntil({ moment: step, until: limits.until })) return
    if (!isInAllowedMonth({ moment: step, byMonth })) continue

    yield* getStepCandidates({ step, times, byDay, startLocal })
  }
}
