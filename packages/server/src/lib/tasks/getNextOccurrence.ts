import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
// Registers the dayjs utc and timezone plugins, which callers of
// getNextOccurrence rely on.
import { dayjs } from './occurrences/dayjsWithTimeZone'
import { getContinuousOccurrence } from './occurrences/getContinuousOccurrence'
import { getRuleNextOccurrence } from './occurrences/getRuleNextOccurrence'
import { parseScheduleStart } from './occurrences/parseScheduleStart'
// Registers the dayjs duration plugin.
import { readActiveDuration } from './occurrences/readActiveDuration'
import { readScheduleFields } from './occurrences/readScheduleFields'

type TaskSchedule = PrismaJson.TaskSchedule

// Occurrences at or within a second of now are treated as already due.
const CURSOR_LEAD_SECONDS = 1

const getOneOffOccurrence = ({
  schedule,
  base,
  cursor,
  nowLocal,
}: {
  schedule: TaskSchedule
  base: Dayjs
  cursor: Dayjs
  nowLocal: Dayjs
}) => {
  if (base.isAfter(cursor)) return base

  const activeFor = readActiveDuration({ schedule })
  if (!activeFor) return null

  return getContinuousOccurrence({ base, activeFor, nowLocal })
}

const getEarliestRuleOccurrence = ({
  recurrenceRules,
  base,
  cursor,
  timeZone,
}: {
  recurrenceRules: RecurrenceRule[]
  base: Dayjs
  cursor: Dayjs
  timeZone: string
}) => {
  const nextOccurrences = [...recurrenceRules]
    .map((rule) => getRuleNextOccurrence({ rule, base, cursor, timeZone }))
    .filter((next): next is Dayjs => next !== null)

  if (!nextOccurrences.length) return null

  return nextOccurrences.reduce((best, next) =>
    next.isBefore(best) ? next : best,
  )
}

export const getNextOccurrence = ({
  schedule,
  now = new Date(),
}: {
  schedule: TaskSchedule
  now?: Date
}): string | null => {
  const fields = readScheduleFields({ schedule })
  if (!fields) return null

  const { start, timeZone, recurrenceRules } = fields
  const base = parseScheduleStart({ start, timeZone })
  if (!base) return null

  const nowLocal = dayjs.tz(now, timeZone)
  const cursor = nowLocal.add(CURSOR_LEAD_SECONDS, 'second')

  const next =
    recurrenceRules.length === 0
      ? getOneOffOccurrence({ schedule, base, cursor, nowLocal })
      : getEarliestRuleOccurrence({ recurrenceRules, base, cursor, timeZone })

  return next ? next.toISOString() : null
}
