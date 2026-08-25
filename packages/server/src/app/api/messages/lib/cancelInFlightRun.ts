import type OpenAI from 'openai'
import { StorageProviderType } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'

/**
 * Cancels an in-flight assistant run when the client disconnects mid-stream.
 *
 * Why this exists
 * ---------------
 * If the client aborts a streaming `/messages` POST without us telling
 * OpenAI to stop, OpenAI keeps the response "active" server-side until it
 * finishes generating. The next user message on the same thread races the
 * still-active response and trips:
 *
 *   HTTP 400 / { code: "conversation_locked",
 *               message: "Another process is currently operating on this
 *                         conversation. Please retry in a few seconds." }
 *
 * Calling `runs.cancel` here releases the conversation lock immediately so
 * the next turn can start without retrying.
 *
 * Storage providers
 * -----------------
 * Both the OpenAI Assistants storage path and the Responses storage path
 * support `beta.threads.runs.cancel`. supercompat's
 * `openaiResponsesStorageAdapter` translates the call to
 * `client.responses.cancel(runId)` internally. Other providers (e.g. local
 * memory storage) don't need this and are skipped.
 *
 * Failure modes
 * -------------
 * Cancel races naturally against completion — by the time we fire it, the
 * upstream response may already be done, in which case OpenAI returns
 * 4xx / "cannot cancel a completed run". That's the success case from our
 * perspective: nothing to cancel, no lock to release. We swallow those.
 */

export type CancelInFlightRunArgs = {
  assistantClient: OpenAI
  storageProviderType: StorageProviderType
  /** The run that the message stream most recently reported as in_progress. */
  inProgressRun: { id: string; thread_id: string } | null
  /** If we already saw `thread.run.completed`, there's nothing to cancel. */
  hasCompleted: boolean
  /** Optional logger for tests + telemetry. Defaults to no-op. */
  onWarn?: (message: string, error?: unknown) => void
}

export type CancelInFlightRunResult =
  | { status: 'no-op'; reason: 'already-completed' }
  | { status: 'no-op'; reason: 'no-run' }
  | { status: 'no-op'; reason: 'unsupported-provider' }
  | { status: 'cancelled' }
  | { status: 'error'; error: unknown }

export const cancelInFlightRun = async ({
  assistantClient,
  storageProviderType,
  inProgressRun,
  hasCompleted,
  onWarn,
}: CancelInFlightRunArgs): Promise<CancelInFlightRunResult> => {
  if (hasCompleted) return { status: 'no-op', reason: 'already-completed' }
  if (!inProgressRun) return { status: 'no-op', reason: 'no-run' }
  const supported =
    isOpenaiAssistantsStorageProvider({ storageProviderType }) ||
    isResponsesStorageProvider({ storageProviderType })
  if (!supported) return { status: 'no-op', reason: 'unsupported-provider' }

  try {
    await assistantClient.beta.threads.runs.cancel(inProgressRun.id, {
      thread_id: inProgressRun.thread_id,
    })
    return { status: 'cancelled' }
  } catch (error) {
    onWarn?.(
      'cancel-on-disconnect: ignoring upstream cancel error',
      (error as { message?: string })?.message ?? error,
    )
    return { status: 'error', error }
  }
}
