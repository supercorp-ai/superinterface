import type OpenAI from 'openai'
import type { PrismaClient } from '@prisma/client'
import { serializeError } from '@/lib/errors/serializeError'
import { logRunError } from './logRunError'
import { runFailedLogMessage } from './runFailedLogMessage'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'

const FAILED_EVENT = 'thread.run.failed'

// Logs runs that fail while their messages stream: stream errors, unless the
// client disconnected, and runs the provider reports as failed.
export const runErrorLogger = ({
  prisma,
  assistant,
  thread,
  signal,
}: {
  prisma: PrismaClient
  assistant: CreateMessageAssistant
  thread: CreateMessageThread
  signal: AbortSignal
}) => {
  const log = ({ message }: { message: string }) =>
    logRunError({ prisma, assistant, thread, message })

  const onError = async ({ error }: { error: unknown }) => {
    if (signal.aborted) return
    console.dir({ error }, { depth: null })

    log({ message: `Thread Run failed: ${serializeError({ error })}` })
  }

  const onEvent = ({
    event,
    data,
  }: {
    event: string
    data: OpenAI.Beta.Threads.Runs.Run
  }) => {
    if (event !== FAILED_EVENT) return

    log({ message: runFailedLogMessage({ run: data }) })
  }

  return { onError, onEvent }
}
