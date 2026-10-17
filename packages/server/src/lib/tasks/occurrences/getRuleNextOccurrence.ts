import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { advanceToMatchingStep } from './advanceToMatchingStep'
import { exceedsRuleCount } from './exceedsRuleCount'
import { getFirstStepNotBefore } from './getFirstStepNotBefore'
import { getRuleUntil } from './getRuleUntil'
import { isAfterUntil } from './isAfterUntil'
import { getRuleStep } from './ruleStep'

export const getRuleNextOccurrence = ({
  rule,
  base,
  cursor,
  timeZone,
}: {
  rule: RecurrenceRule
  base: Dayjs
  cursor: Dayjs
  timeZone: string
}): Dayjs | null => {
  const step = getRuleStep({ rule })
  if (!step) return null

  const next = advanceToMatchingStep({
    moment: getFirstStepNotBefore({ base, cursor, step }),
    rule,
    step,
  })

  if (isAfterUntil({ moment: next, until: getRuleUntil({ rule, timeZone }) })) {
    return null
  }
  if (exceedsRuleCount({ rule, base, step, next })) return null

  return next
}
