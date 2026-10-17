import type { Dayjs } from 'dayjs'

// Two-letter weekday code as used by byDay, e.g. 'MO'.
export const getDayCode = ({ moment }: { moment: Dayjs }) =>
  moment.format('dd').toUpperCase()
