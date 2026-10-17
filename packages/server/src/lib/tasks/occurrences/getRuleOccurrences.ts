import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import {
  generateSeriesCandidates,
  type SeriesUnit,
} from './generateSeriesCandidates'
import { generateWeeklyCandidates } from './generateWeeklyCandidates'
import type { OccurrenceWindow } from './occurrenceWindow'
import { getRuleLimits, type RuleLimits } from './ruleLimits'
import { takeOccurrences } from './takeOccurrences'

type FrequencyUnit = 'week' | SeriesUnit

const FREQUENCY_UNITS = new Map<string, FrequencyUnit>([
  ['weekly', 'week'],
  ['daily', 'day'],
  ['monthly', 'month'],
  ['yearly', 'year'],
  ['hourly', 'hour'],
  ['minutely', 'minute'],
])

const getRuleCandidates = ({
  startLocal,
  rule,
  unit,
  limits,
  window,
}: {
  startLocal: Dayjs
  rule: RecurrenceRule
  unit: FrequencyUnit
  limits: RuleLimits
  window: OccurrenceWindow
}): Iterable<Dayjs> => {
  if (unit === 'week') {
    return generateWeeklyCandidates({
      startLocal,
      rule,
      limits,
      lookAheadEnd: window.lookAheadEnd,
    })
  }

  return generateSeriesCandidates({ startLocal, rule, unit, limits })
}

export const getRuleOccurrences = ({
  startLocal,
  rule,
  timeZone,
  window,
  limit,
}: {
  startLocal: Dayjs
  rule: RecurrenceRule
  timeZone: string
  window: OccurrenceWindow
  limit: number
}): Dayjs[] => {
  const unit = FREQUENCY_UNITS.get(rule.frequency.toLowerCase())
  // Unsupported frequencies fall back to no additional occurrences.
  if (!unit) return []

  const limits = getRuleLimits({ rule, timeZone })

  return takeOccurrences({
    candidates: getRuleCandidates({ startLocal, rule, unit, limits, window }),
    limits,
    window,
    limit,
  })
}
