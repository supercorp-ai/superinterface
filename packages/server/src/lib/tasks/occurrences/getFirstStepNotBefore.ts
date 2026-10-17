import type { Dayjs } from 'dayjs'
import type { RuleStep } from './ruleStep'

// The first time on the rule's step grid from `base` that is not before
// `cursor`.
export const getFirstStepNotBefore = ({
  base,
  cursor,
  step,
}: {
  base: Dayjs
  cursor: Dayjs
  step: RuleStep
}) => {
  if (!base.isBefore(cursor)) return base

  const { unit, interval } = step
  const wholeSteps = Math.floor(cursor.diff(base, unit) / interval)
  let next = base.add(wholeSteps * interval, unit)
  while (next.isBefore(cursor)) next = next.add(interval, unit)

  return next
}
