import type { Dayjs } from 'dayjs'

// Times stepped or rolled back to before the schedule start never occur.
export const isBeforeStart = ({
  moment,
  startLocal,
}: {
  moment: Dayjs
  startLocal: Dayjs
}) => moment.isBefore(startLocal)
