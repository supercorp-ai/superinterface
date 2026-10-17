// QStash retries a failed callback at most this many times, so a broken task
// is not run over and over.
export const TASK_DELIVERY_RETRIES = 2

// How long QStash waits for the callback to respond; matches the task
// execution lock, so a delivery never outlives its lock.
export const TASK_DELIVERY_TIMEOUT = '15m'
