import type { Dayjs } from 'dayjs'
import { isBeforeStart } from './isBeforeStart'

export const dropBeforeStart = ({
  moments,
  startLocal,
}: {
  moments: Dayjs[]
  startLocal: Dayjs
}) => moments.filter((moment) => !isBeforeStart({ moment, startLocal }))
