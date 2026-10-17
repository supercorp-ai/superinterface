import { redis } from '@/lib/redis'
import type { ClientToolOutputKeys } from './clientToolOutputKeys'

const TIMEOUT_MS = 60000
const POLL_INTERVAL_MS = 500
const TIMEOUT_OUTPUT = 'Function call timed out'

// Polls Redis until the client submits its output, then clears both keys.
// Resolves with a timeout message after TIMEOUT_MS, but keeps polling so a
// late output is still cleaned up.
export const pollClientToolOutput = ({
  keys,
}: {
  keys: ClientToolOutputKeys
}) =>
  new Promise<unknown>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(TIMEOUT_OUTPUT)
    }, TIMEOUT_MS)

    const checkResult = async () => {
      const result = await redis.get(keys.output)

      if (result === null) {
        setTimeout(checkResult, POLL_INTERVAL_MS)
        return
      }

      clearTimeout(timeout)

      await redis.del(keys.pending)
      await redis.del(keys.output)
      resolve(result)
    }

    checkResult()
  })
