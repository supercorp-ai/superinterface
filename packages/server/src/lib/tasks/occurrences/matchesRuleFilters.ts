import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { getDayCode } from './getDayCode'
import { getMonthNumber } from './getMonthNumber'
import { isAllowedValue } from './isAllowedValue'

type RuleFilter = {
  allowed: (string | number)[] | undefined
  value: string | number
}

const getRuleFilters = ({
  moment,
  rule,
}: {
  moment: Dayjs
  rule: RecurrenceRule
}): RuleFilter[] => [
  { allowed: rule.byMonth, value: getMonthNumber({ moment }) },
  { allowed: rule.byDay, value: getDayCode({ moment }) },
  { allowed: rule.byHour, value: moment.hour() },
  { allowed: rule.byMinute, value: moment.minute() },
  { allowed: rule.bySecond, value: moment.second() },
]

// Whether `moment` satisfies every by-rule list the rule sets.
export const matchesRuleFilters = ({
  moment,
  rule,
}: {
  moment: Dayjs
  rule: RecurrenceRule
}) => getRuleFilters({ moment, rule }).every(isAllowedValue)
