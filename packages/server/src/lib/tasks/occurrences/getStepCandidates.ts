import type { Dayjs } from 'dayjs'
import { dropBeforeStart } from './dropBeforeStart'
import { getDayCandidates } from './getDayCandidates'
import { getDayCode } from './getDayCode'
import { isAllowedValue } from './isAllowedValue'
import type { RuleTimes } from './ruleTimes'

// Candidate times built from one series step, on or after the start and on
// an allowed weekday.
export const getStepCandidates = ({
  step,
  times,
  byDay,
  startLocal,
}: {
  step: Dayjs
  times: RuleTimes
  byDay: string[] | null
  startLocal: Dayjs
}) =>
  dropBeforeStart({
    moments: getDayCandidates({ day: step, times }),
    startLocal,
  }).filter((candidate) =>
    isAllowedValue({
      allowed: byDay,
      value: getDayCode({ moment: candidate }),
    }),
  )
