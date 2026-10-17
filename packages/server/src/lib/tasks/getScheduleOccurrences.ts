import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { dayjs } from './occurrences/dayjsWithTimeZone'
import { getRuleOccurrences } from './occurrences/getRuleOccurrences'
import { nonEmptyList } from './occurrences/nonEmptyList'
import { isWithinWindow } from './occurrences/isWithinWindow'
import { getOccurrenceWindow } from './occurrences/occurrenceWindow'
import { readScheduleFields } from './occurrences/readScheduleFields'

type TaskSchedule = PrismaJson.TaskSchedule

const isUsableRule = (rule: RecurrenceRule) =>
  rule && typeof rule === 'object' && rule.frequency

// Rules are expanded in order; the first `maxOccurrences` distinct times
// are kept.
const keepFirstDistinct = ({
  occurrences,
  maxOccurrences,
}: {
  occurrences: Dayjs[]
  maxOccurrences: number
}) => {
  const distinct = new Map(
    occurrences.map((occurrence) => [occurrence.valueOf(), occurrence.utc()]),
  )

  return Array.from(distinct.values())
    .slice(0, maxOccurrences)
    .sort((a, b) => a.valueOf() - b.valueOf())
}

export const getScheduleOccurrences = ({
  schedule,
  lookAheadDays,
  maxOccurrences,
}: {
  schedule: TaskSchedule | null | undefined
  lookAheadDays: number
  maxOccurrences: number
}): Dayjs[] => {
  const fields = readScheduleFields({ schedule })
  if (!fields) return []

  const { start, timeZone, recurrenceRules } = fields
  const startLocal = dayjs(start).tz(timeZone)
  if (!startLocal.isValid()) return []

  const window = getOccurrenceWindow({ timeZone, lookAheadDays })

  // Without a non-empty rule list the schedule is a one-off at its start.
  const rules = nonEmptyList({ list: recurrenceRules })
  if (!rules) {
    if (!isWithinWindow({ candidate: startLocal, window })) return []
    return [startLocal.utc()]
  }

  const occurrences = rules.filter(isUsableRule).flatMap((rule) =>
    getRuleOccurrences({
      startLocal,
      rule,
      timeZone,
      window,
      limit: maxOccurrences,
    }),
  )

  return keepFirstDistinct({ occurrences, maxOccurrences })
}
