import type { Dayjs } from 'dayjs'
import type { RuleTimes } from './ruleTimes'

export const getDayCandidates = ({
  day,
  times,
}: {
  day: Dayjs
  times: RuleTimes
}) =>
  times.hours.flatMap((hour) =>
    times.minutes.flatMap((minute) =>
      times.seconds.map((second) =>
        day.hour(hour).minute(minute).second(second).millisecond(0),
      ),
    ),
  )
