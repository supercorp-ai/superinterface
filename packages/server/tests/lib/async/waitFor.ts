import { setTimeout as sleep } from 'node:timers/promises'

// Polls `check` until it returns a truthy value or the timeout elapses.
export const waitFor = async <T>({
  check,
  timeoutMs = 5000,
  intervalMs = 25,
}: {
  check: () => T | Promise<T>
  timeoutMs?: number
  intervalMs?: number
}): Promise<NonNullable<T>> => {
  const deadline = Date.now() + timeoutMs

  while (true) {
    const result = await check()
    if (result) return result as NonNullable<T>
    if (Date.now() > deadline) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`)
    }
    await sleep(intervalMs)
  }
}
