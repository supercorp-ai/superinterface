import type OpenAI from 'openai'
import type { StorageProviderType } from '@prisma/client'
import { cancelInFlightRun } from './cancelInFlightRun'
import { runProgressTracker } from './runProgressTracker'

// Follows the runs a message stream reports so the run still in flight when
// the client disconnects can be cancelled, releasing the conversation lock —
// see `cancelInFlightRun` for the full rationale.
export const inFlightRun = ({
  assistantClient,
  storageProviderType,
}: {
  assistantClient: OpenAI
  storageProviderType: StorageProviderType
}) => {
  const { track, progress } = runProgressTracker()

  const cancel = async () => {
    await cancelInFlightRun({
      assistantClient,
      storageProviderType,
      ...progress(),
      onWarn: (message, error) => console.warn(message, error),
    })
  }

  return { track, cancel }
}
