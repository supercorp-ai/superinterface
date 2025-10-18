import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

type TaskSchedule = PrismaJson.TaskSchedule
type RecurrenceRule = NonNullable<TaskSchedule['recurrenceRules']>[number]

type Options = {
  now?: Date
  lookAheadDays?: number
  maxOccurrences?: number
}

const DEFAULT_LOOKAHEAD_DAYS = 90
const DEFAULT_MAX_OCCURRENCES = 60
const LOOKBACK_MINUTES = 15

const DAY_CODE_TO_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

const parseDayCode = (value: string): number | null => {
  const code = value.slice(-2).toUpperCase()
  return Object.prototype.hasOwnProperty.call(DAY_CODE_TO_INDEX, code)
    ? DAY_CODE_TO_INDEX[code]
    : null
}

const uniqueSorted = (values: number[]) =>
  Array.from(new Set(values)).sort((a, b) => a - b)

const normaliseTimePart = (list: number[] | undefined, fallback: number) =>
  list && list.length ? uniqueSorted(list) : [fallback]

const shouldIncludeCandidate = ({
  candidate,
  earliestAllowed,
  lookAheadEnd,
}: {
  candidate: Dayjs
  earliestAllowed: Dayjs
  lookAheadEnd: Dayjs
}): boolean => {
  if (candidate.isBefore(earliestAllowed)) return false
  if (candidate.isAfter(lookAheadEnd)) return false
  return true
}

const handleCountAndUntil = ({
  candidate,
  countLimit,
  produced,
  until,
}: {
  candidate: Dayjs
  countLimit: number
  produced: number
  until: Dayjs | null
}): { shouldContinue: boolean; produced: number } => {
  if (until && candidate.isAfter(until)) {
    return { shouldContinue: false, produced }
  }
  if (produced >= countLimit) {
    return { shouldContinue: false, produced }
  }
  return { shouldContinue: true, produced: produced + 1 }
}

const generateWeeklyOccurrences = ({
  startLocal,
  rule,
  timeZone,
  lookAheadEnd,
  earliestAllowed,
  limit,
}: {
  startLocal: Dayjs
  rule: RecurrenceRule
  timeZone: string
  lookAheadEnd: Dayjs
  earliestAllowed: Dayjs
  limit: number
}) => {
  const days = uniqueSorted(
    (Array.isArray(rule.byDay) && rule.byDay.length
      ? rule.byDay
      : [startLocal.format('dd').toUpperCase()]
    )
      .map(parseDayCode)
      .filter((value): value is number => value !== null),
  )
  if (!days.length) days.push(startLocal.day())

  const hours = normaliseTimePart(rule.byHour, startLocal.hour())
  const minutes = normaliseTimePart(rule.byMinute, startLocal.minute())
  const seconds = normaliseTimePart(rule.bySecond, startLocal.second())

  const interval = Math.max(1, rule.interval ?? 1)
  const countLimit = Math.max(0, rule.count ?? Number.POSITIVE_INFINITY)
  const until = rule.until ? dayjs.tz(rule.until, timeZone) : null

  const byMonth =
    Array.isArray(rule.byMonth) && rule.byMonth.length ? rule.byMonth : null

  const baseWeekStart = startLocal.startOf('week')
  const occurrences: Dayjs[] = []

  let produced = 0
  let weekIndex = 0
  const maxIterations = 1000

  while (
    occurrences.length < limit &&
    weekIndex < maxIterations &&
    produced < countLimit
  ) {
    const weekStart = baseWeekStart.add(weekIndex * interval, 'week')
    if (weekStart.isAfter(lookAheadEnd)) break

    for (const dayIndex of days) {
      const dayLocal = weekStart.add(dayIndex, 'day')
      if (dayLocal.isBefore(startLocal)) continue
      if (until && dayLocal.isAfter(until)) return occurrences
      if (byMonth && !byMonth.includes(dayLocal.month() + 1)) continue

      for (const hour of hours) {
        for (const minute of minutes) {
          for (const second of seconds) {
            const candidate = dayLocal
              .hour(hour)
              .minute(minute)
              .second(second)
              .millisecond(0)

            if (candidate.isBefore(startLocal)) continue

            const { shouldContinue, produced: nextProduced } =
              handleCountAndUntil({
                candidate,
                countLimit,
                produced,
                until,
              })
            produced = nextProduced
            if (!shouldContinue) return occurrences

            if (
              !shouldIncludeCandidate({
                candidate,
                earliestAllowed,
                lookAheadEnd,
              })
            )
              continue

            occurrences.push(candidate)
            if (occurrences.length >= limit) return occurrences
          }
        }
      }
    }

    weekIndex += 1
  }

  return occurrences
}

const generateSimpleSeries = ({
  startLocal,
  rule,
  unit,
  lookAheadEnd,
  earliestAllowed,
  limit,
  timeZone,
}: {
  startLocal: Dayjs
  rule: RecurrenceRule
  unit: 'day' | 'hour' | 'minute' | 'month' | 'year'
  lookAheadEnd: Dayjs
  earliestAllowed: Dayjs
  limit: number
  timeZone: string
}) => {
  const hours = normaliseTimePart(rule.byHour, startLocal.hour())
  const minutes = normaliseTimePart(rule.byMinute, startLocal.minute())
  const seconds = normaliseTimePart(rule.bySecond, startLocal.second())

  const interval = Math.max(1, rule.interval ?? 1)
  const countLimit = Math.max(0, rule.count ?? Number.POSITIVE_INFINITY)
  const until = rule.until ? dayjs.tz(rule.until, timeZone) : null
  const byMonth =
    Array.isArray(rule.byMonth) && rule.byMonth.length ? rule.byMonth : null
  const byDay =
    Array.isArray(rule.byDay) && rule.byDay.length ? rule.byDay : null

  const occurrences: Dayjs[] = []

  let produced = 0
  let index = 0
  const maxIterations = 5000

  while (
    occurrences.length < limit &&
    produced < countLimit &&
    index < maxIterations
  ) {
    const base = startLocal.add(index * interval, unit)
    index += 1

    if (base.isBefore(startLocal)) continue
    if (until && base.isAfter(until)) break
    if (byMonth && !byMonth.includes(base.month() + 1)) continue

    for (const hour of hours) {
      for (const minute of minutes) {
        for (const second of seconds) {
          const candidate = base
            .hour(hour)
            .minute(minute)
            .second(second)
            .millisecond(0)

          if (candidate.isBefore(startLocal)) continue
          if (byDay) {
            const code = candidate.format('dd').toUpperCase()
            if (!byDay.includes(code)) continue
          }

          const { shouldContinue, produced: nextProduced } =
            handleCountAndUntil({
              candidate,
              countLimit,
              produced,
              until,
            })
          produced = nextProduced
          if (!shouldContinue) return occurrences

          if (
            !shouldIncludeCandidate({
              candidate,
              earliestAllowed,
              lookAheadEnd,
            })
          )
            continue

          occurrences.push(candidate)
          if (occurrences.length >= limit) return occurrences
        }
      }
    }
  }

  return occurrences
}

const generateOccurrencesForRule = ({
  startLocal,
  rule,
  timeZone,
  lookAheadEnd,
  earliestAllowed,
  limit,
}: {
  startLocal: Dayjs
  rule: RecurrenceRule
  timeZone: string
  lookAheadEnd: Dayjs
  earliestAllowed: Dayjs
  limit: number
}): Dayjs[] => {
  const frequency = rule.frequency.toLowerCase()

  if (frequency === 'weekly') {
    return generateWeeklyOccurrences({
      startLocal,
      rule,
      timeZone,
      lookAheadEnd,
      earliestAllowed,
      limit,
    })
  }

  if (frequency === 'daily') {
    return generateSimpleSeries({
      startLocal,
      rule,
      unit: 'day',
      lookAheadEnd,
      earliestAllowed,
      limit,
      timeZone,
    })
  }

  if (frequency === 'monthly') {
    return generateSimpleSeries({
      startLocal,
      rule,
      unit: 'month',
      lookAheadEnd,
      earliestAllowed,
      limit,
      timeZone,
    })
  }

  if (frequency === 'yearly') {
    return generateSimpleSeries({
      startLocal,
      rule,
      unit: 'year',
      lookAheadEnd,
      earliestAllowed,
      limit,
      timeZone,
    })
  }

  if (frequency === 'hourly') {
    return generateSimpleSeries({
      startLocal,
      rule,
      unit: 'hour',
      lookAheadEnd,
      earliestAllowed,
      limit,
      timeZone,
    })
  }

  if (frequency === 'minutely') {
    return generateSimpleSeries({
      startLocal,
      rule,
      unit: 'minute',
      lookAheadEnd,
      earliestAllowed,
      limit,
      timeZone,
    })
  }

  // Unsupported frequencies fall back to no additional occurrences.
  return []
}

export const getScheduleOccurrences = (
  schedule: TaskSchedule | null | undefined,
  options: Options = {},
): Dayjs[] => {
  if (!schedule || typeof schedule !== 'object') return []

  const { now = new Date(), lookAheadDays, maxOccurrences } = options
  const effectiveLookAheadDays = lookAheadDays ?? DEFAULT_LOOKAHEAD_DAYS
  const effectiveMaxOccurrences = maxOccurrences ?? DEFAULT_MAX_OCCURRENCES

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { start, timeZone = 'UTC', recurrenceRules = [] } = schedule as any
  if (typeof start !== 'string') return []

  const startLocal = dayjs(start).tz(timeZone)
  if (!startLocal.isValid()) return []

  const nowLocal = dayjs(now).tz(timeZone)
  const lookAheadEnd = nowLocal.add(effectiveLookAheadDays, 'day')
  const earliestAllowed = nowLocal.subtract(LOOKBACK_MINUTES, 'minute')

  const results: Dayjs[] = []
  const seen = new Set<number>()

  const addOccurrence = (occurrence: Dayjs) => {
    const timestamp = occurrence.valueOf()
    if (seen.has(timestamp)) return
    seen.add(timestamp)
    results.push(occurrence.utc())
  }

  if (!Array.isArray(recurrenceRules) || recurrenceRules.length === 0) {
    if (
      shouldIncludeCandidate({
        candidate: startLocal,
        earliestAllowed,
        lookAheadEnd,
      })
    )
      addOccurrence(startLocal)
    return results.sort((a, b) => a.valueOf() - b.valueOf())
  }

  for (const rule of recurrenceRules) {
    if (!rule || typeof rule !== 'object' || !rule.frequency) continue

    const occurrences = generateOccurrencesForRule({
      startLocal,
      rule,
      timeZone,
      lookAheadEnd,
      earliestAllowed,
      limit: effectiveMaxOccurrences,
    })

    for (const occurrence of occurrences) {
      addOccurrence(occurrence)
      if (results.length >= effectiveMaxOccurrences) break
    }
    if (results.length >= effectiveMaxOccurrences) break
  }

  return results.sort((a, b) => a.valueOf() - b.valueOf())
}
