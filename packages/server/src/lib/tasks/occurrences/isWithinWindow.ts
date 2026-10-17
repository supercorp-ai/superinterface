import type { Dayjs } from 'dayjs'
import type { OccurrenceWindow } from './occurrenceWindow'

export const isWithinWindow = ({
  candidate,
  window,
}: {
  candidate: Dayjs
  window: OccurrenceWindow
}) => {
  if (candidate.isBefore(window.earliestAllowed)) return false
  return !candidate.isAfter(window.lookAheadEnd)
}
