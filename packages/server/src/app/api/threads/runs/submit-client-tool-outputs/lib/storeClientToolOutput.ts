import { redis } from '@/lib/redis'
import { clientToolOutputKeys } from '@/lib/functions/handleFunction/clientTool/clientToolOutputKeys'
import type { ClientToolOutput } from './clientToolOutput'

// Hands the output to the run waiting on this tool call. Outputs for calls
// that are not pending are dropped.
export const storeClientToolOutput = async ({
  toolOutput,
}: {
  toolOutput: ClientToolOutput
}) => {
  const keys = clientToolOutputKeys({ toolCallId: toolOutput.toolCallId })
  const isPending = await redis.get(keys.pending)

  if (!isPending) return

  // One week, in seconds: as long as the tool call stays pending.
  const ttlSeconds = 60 * 60 * 24 * 7

  await redis.set(keys.output, JSON.stringify(toolOutput.output), {
    ex: ttlSeconds,
  })
}
