import type { Dayjs } from 'dayjs'

export const isAfterUntil = ({
  moment,
  until,
}: {
  moment: Dayjs
  until: Dayjs | null
}) => Boolean(until && moment.isAfter(until))
