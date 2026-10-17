import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Schedule times are read and stepped in the schedule's own time zone, so
// every occurrence helper imports dayjs from here to get these plugins.
dayjs.extend(utc)
dayjs.extend(timezone)

export { dayjs }
