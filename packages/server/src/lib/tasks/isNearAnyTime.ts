import { FIFTEEN_MINUTES_IN_MS } from './scheduleConflictWindow'

export const isNearAnyTime = ({
  time,
  times,
}: {
  time: number
  times: number[]
}) => times.some((other) => Math.abs(other - time) < FIFTEEN_MINUTES_IN_MS)
