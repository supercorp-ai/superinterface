import type { Dayjs } from 'dayjs'
import { getMonthNumber } from './getMonthNumber'
import { isAllowedValue } from './isAllowedValue'

export const isInAllowedMonth = ({
  moment,
  byMonth,
}: {
  moment: Dayjs
  byMonth: number[] | null
}) => isAllowedValue({ allowed: byMonth, value: getMonthNumber({ moment }) })
