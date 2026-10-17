import type { Dayjs } from 'dayjs'
import { dropBeforeStart } from './dropBeforeStart'
import { getDayCandidates } from './getDayCandidates'
import { isInAllowedMonth } from './isInAllowedMonth'
import type { RuleTimes } from './ruleTimes'

export type DayCandidate = {
  day: Dayjs
  candidate: Dayjs
}

// Candidate times in one week, each paired with the day it was built from.
// Days are compared with the start at midnight, so the start day itself is
// skipped when the start is later that day.
export const getWeekCandidates = ({
  weekStart,
  weekdays,
  times,
  byMonth,
  startLocal,
}: {
  weekStart: Dayjs
  weekdays: number[]
  times: RuleTimes
  byMonth: number[] | null
  startLocal: Dayjs
}): DayCandidate[] =>
  dropBeforeStart({
    moments: weekdays.map((weekday) => weekStart.add(weekday, 'day')),
    startLocal,
  })
    .filter((day) => isInAllowedMonth({ moment: day, byMonth }))
    .flatMap((day) =>
      dropBeforeStart({
        moments: getDayCandidates({ day, times }),
        startLocal,
      }).map((candidate) => ({ day, candidate })),
    )
