import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import type { RuleStep } from './ruleStep'

// Whether `next` lies past the last of the rule's `count` steps from `base`.
// A count of zero sets no limit.
export const exceedsRuleCount = ({
  rule,
  base,
  step,
  next,
}: {
  rule: RecurrenceRule
  base: Dayjs
  step: RuleStep
  next: Dayjs
}) => {
  if (!rule.count) return false

  const lastStep = base.add(step.interval * rule.count, step.unit)
  return lastStep.isBefore(next)
}
