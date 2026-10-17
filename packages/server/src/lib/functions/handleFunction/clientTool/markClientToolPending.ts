import { redis } from '@/lib/redis'
import type { ClientToolOutputKeys } from './clientToolOutputKeys'

const PENDING_MARKER = '1'

// Lets the submit-client-tool-outputs route accept output for this call for
// up to a week.
export const markClientToolPending = async ({
  keys,
}: {
  keys: ClientToolOutputKeys
}) => {
  await redis.set(keys.pending, PENDING_MARKER, {
    // One week, in seconds.
    ex: 60 * 60 * 24 * 7,
  })
}
