import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { getDayCode } from './getDayCode'
import { nonEmptyList } from './nonEmptyList'
import { parseDayCode } from './parseDayCode'
import { uniqueSorted } from './uniqueSorted'

// Weekdays a weekly rule fires on, falling back to the start's weekday.
export const getWeekdayIndexes = ({
  rule,
  startLocal,
}: {
  rule: RecurrenceRule
  startLocal: Dayjs
}) => {
  const dayCodes = nonEmptyList({ list: rule.byDay }) ?? [
    getDayCode({ moment: startLocal }),
  ]
  const weekdays = uniqueSorted({
    values: dayCodes
      .map((value) => parseDayCode({ value }))
      .filter((value): value is number => value !== null),
  })
  if (!weekdays.length) return [startLocal.day()]

  return weekdays
}
