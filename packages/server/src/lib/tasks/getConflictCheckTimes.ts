import { getScheduleOccurrences } from './getScheduleOccurrences'

// Conflicts are only looked for in the coming year...
const LOOKAHEAD_DAYS = 365
// ...and among each schedule's first occurrences, which bounds the pairwise
// comparison for frequent schedules.
const MAX_OCCURRENCES = 120

// The upcoming occurrences, in epoch milliseconds, that schedule conflicts
// are checked against.
export const getConflictCheckTimes = ({
  schedule,
}: {
  schedule: PrismaJson.TaskSchedule | null | undefined
}) =>
  getScheduleOccurrences({
    schedule,
    lookAheadDays: LOOKAHEAD_DAYS,
    maxOccurrences: MAX_OCCURRENCES,
  }).map((occurrence) => occurrence.valueOf())
