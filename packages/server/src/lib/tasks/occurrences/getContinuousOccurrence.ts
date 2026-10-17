import type { Dayjs } from 'dayjs'
import type { Duration } from 'dayjs/plugin/duration'

// Continuous task: start + duration defines the active window. While we are
// still within it, it fires immediately (now).
export const getContinuousOccurrence = ({
  base,
  activeFor,
  nowLocal,
}: {
  base: Dayjs
  activeFor: Duration
  nowLocal: Dayjs
}) => {
  const end = base.add(activeFor)
  if (!nowLocal.isBefore(end)) return null

  return nowLocal
}
