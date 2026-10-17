import type { Dayjs } from 'dayjs'

// dayjs months are zero-based; byMonth uses 1 for January.
const FIRST_MONTH_NUMBER = 1

export const getMonthNumber = ({ moment }: { moment: Dayjs }) =>
  moment.month() + FIRST_MONTH_NUMBER
