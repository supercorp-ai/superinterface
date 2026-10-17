import type { Dayjs } from 'dayjs'
import type { RecurrenceRule } from '@/types'
import { uniqueSorted } from './uniqueSorted'

export type RuleTimes = {
  hours: number[]
  minutes: number[]
  seconds: number[]
}

const normaliseTimePart = ({
  list,
  fallback,
}: {
  list: number[] | undefined
  fallback: number
}) => (list && list.length ? uniqueSorted({ values: list }) : [fallback])

// Times of day a rule fires at; parts without a by-rule keep the start's.
export const getRuleTimes = ({
  rule,
  startLocal,
}: {
  rule: RecurrenceRule
  startLocal: Dayjs
}): RuleTimes => ({
  hours: normaliseTimePart({ list: rule.byHour, fallback: startLocal.hour() }),
  minutes: normaliseTimePart({
    list: rule.byMinute,
    fallback: startLocal.minute(),
  }),
  seconds: normaliseTimePart({
    list: rule.bySecond,
    fallback: startLocal.second(),
  }),
})
