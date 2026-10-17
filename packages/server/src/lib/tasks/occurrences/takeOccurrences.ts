import type { Dayjs } from 'dayjs'
import { isAfterUntil } from './isAfterUntil'
import { isWithinWindow } from './isWithinWindow'
import type { OccurrenceWindow } from './occurrenceWindow'
import type { RuleLimits } from './ruleLimits'

// Counts candidates towards the rule's count until one passes `until` or the
// count runs out, keeping those inside the window, up to `limit`.
export const takeOccurrences = ({
  candidates,
  limits,
  window,
  limit,
}: {
  candidates: Iterable<Dayjs>
  limits: RuleLimits
  window: OccurrenceWindow
  limit: number
}) => {
  const occurrences: Dayjs[] = []
  let produced = 0

  for (const candidate of candidates) {
    if (isAfterUntil({ moment: candidate, until: limits.until })) break
    if (produced >= limits.countLimit) break
    produced += 1

    if (!isWithinWindow({ candidate, window })) continue

    occurrences.push(candidate)
    if (occurrences.length >= limit) break
  }

  return occurrences
}
