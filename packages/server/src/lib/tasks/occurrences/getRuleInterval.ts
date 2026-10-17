import type { RecurrenceRule } from '@/types'

const MIN_INTERVAL = 1

export const getRuleInterval = ({ rule }: { rule: RecurrenceRule }) =>
  Math.max(MIN_INTERVAL, rule.interval ?? MIN_INTERVAL)
