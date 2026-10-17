import type OpenAI from 'openai'
import type { PrismaClient } from '@prisma/client'
import { createMessageResponse } from '@superinterface/react/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { handleToolCall } from '@/lib/toolCalls/handleToolCall'
import { inFlightRun } from './inFlightRun'
import { runErrorLogger } from './runErrorLogger'
import { enqueueThreadCreated } from './enqueueThreadCreated'
import type { RunStream } from './startRunStream'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'

const STREAM_HEADERS = {
  ...cacheHeaders,
  'Content-Type': 'application/json; charset=utf-8',
}

// Streams the run's events back to the client, announcing a newly created
// thread first, logging failed runs and cancelling the run on disconnect.
export const createMessageStreamResponse = ({
  assistantClient,
  createRunStream,
  assistant,
  thread,
  isThreadCreated,
  prisma,
  signal,
}: {
  assistantClient: OpenAI
  createRunStream: RunStream
  assistant: CreateMessageAssistant
  thread: CreateMessageThread
  isThreadCreated: boolean
  prisma: PrismaClient
  signal: AbortSignal
}) => {
  const { onError, onEvent: logFailedRun } = runErrorLogger({
    prisma,
    assistant,
    thread,
    signal,
  })

  const { track, cancel } = inFlightRun({
    assistantClient,
    storageProviderType: assistant.storageProviderType,
  })

  return new Response(
    createMessageResponse({
      client: assistantClient,
      createRunStream,
      handleToolCall: handleToolCall({ assistant, thread, prisma }),
      onStart: ({
        controller,
      }: {
        controller: ReadableStreamDefaultController
      }) => enqueueThreadCreated({ controller, thread, isThreadCreated }),
      onError,
      onEvent: (runEvent) => {
        logFailedRun(runEvent)
        track(runEvent)
      },
      onClose: cancel,
    }),
    {
      status: 200,
      headers: STREAM_HEADERS,
    },
  )
}
