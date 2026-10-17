import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { dayjs } from './dayjsWithTimeZone'

export const getRuleUntil = ({
  rule,
  timeZone,
}: {
  rule: RecurrenceRule
  timeZone: string
}): Dayjs | null => (rule.until ? dayjs.tz(rule.until, timeZone) : null)
