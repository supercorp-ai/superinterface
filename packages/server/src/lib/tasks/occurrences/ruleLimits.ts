import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { getRuleInterval } from './getRuleInterval'
import { getRuleUntil } from './getRuleUntil'

export type RuleLimits = {
  interval: number
  countLimit: number
  until: Dayjs | null
}

export const getRuleLimits = ({
  rule,
  timeZone,
}: {
  rule: RecurrenceRule
  timeZone: string
}): RuleLimits => ({
  interval: getRuleInterval({ rule }),
  countLimit: Math.max(0, rule.count ?? Number.POSITIVE_INFINITY),
  until: getRuleUntil({ rule, timeZone }),
})
