import type { RecurrenceRule } from '@/types'
import { getRuleInterval } from './getRuleInterval'

type StepUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export type RuleStep = {
  unit: StepUnit
  interval: number
}

const FREQUENCY_STEP_UNITS: Record<string, StepUnit> = {
  secondly: 'second',
  minutely: 'minute',
  hourly: 'hour',
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}

// How far one occurrence of the rule moves time, or null when the frequency
// is not supported.
export const getRuleStep = ({
  rule,
}: {
  rule: RecurrenceRule
}): RuleStep | null => {
  const unit = FREQUENCY_STEP_UNITS[rule.frequency]
  if (!unit) return null

  return { unit, interval: getRuleInterval({ rule }) }
}
