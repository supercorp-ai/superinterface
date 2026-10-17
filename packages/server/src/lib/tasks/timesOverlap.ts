import { isNearAnyTime } from './isNearAnyTime'

// Two occurrence lists overlap when any pair falls within the conflict
// window.
export const timesOverlap = ({
  targetTimes,
  existingTimes,
}: {
  targetTimes: number[]
  existingTimes: number[]
}) => targetTimes.some((time) => isNearAnyTime({ time, times: existingTimes }))
