import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { matchesRuleFilters } from './matchesRuleFilters'
import type { RuleStep } from './ruleStep'

// Stepping gives up after this many steps and keeps the last time reached.
const MAX_MATCH_STEPS = 5000

export const advanceToMatchingStep = ({
  moment,
  rule,
  step,
}: {
  moment: Dayjs
  rule: RecurrenceRule
  step: RuleStep
}) => {
  let next = moment

  for (let stepCount = 0; stepCount < MAX_MATCH_STEPS; stepCount += 1) {
    if (matchesRuleFilters({ moment: next, rule })) return next
    next = next.add(step.interval, step.unit)
  }

  return next
}
