// Registers the dayjs utc plugin.
import { dayjs } from './occurrences/dayjsWithTimeZone'

// Whole seconds from now until the occurrence, never negative.
export const getTaskDeliveryDelay = ({ nextIso }: { nextIso: string }) =>
  Math.max(0, dayjs.utc(nextIso).diff(dayjs.utc(), 'second'))
