import type OpenAI from 'openai'
import { validate } from 'uuid'
import type { PrismaClient } from '@prisma/client'
import { enqueueJson } from '@superinterface/react/utils'
import { deltaText } from './outputStream/deltaText'
import { toolCallIndex } from './outputStream/toolCallIndex'
import { toolCallOutputDelta } from './outputStream/toolCallOutputDelta'
import { readMessageEvents } from './outputStream/readMessageEvents'
import { findLatestRunStep } from './outputStream/findLatestRunStep'

// Streams a handler run's message deltas into the parent stream as the tool
// call's output and reports each completed message.
export const streamOutput = async ({
  toolCall,
  run,
  messageResponse,
  onThreadMessageCompleted,
  controller,
  prisma,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  run: OpenAI.Beta.Threads.Runs.Run
  controller: ReadableStreamDefaultController
  messageResponse: ReadableStream<Uint8Array>
  onThreadMessageCompleted: ({
    message,
  }: {
    message: OpenAI.Beta.Threads.Messages.Message
  }) => void
  prisma: PrismaClient
}) => {
  // TODO figure out how to stream non-prisma runs
  if (!validate(run.id)) {
    return
  }

  const latestRunStep = await findLatestRunStep({ runId: run.id, prisma })
  const index = toolCallIndex({ run, toolCall })

  for await (const event of readMessageEvents({ messageResponse })) {
    if (event.event === 'thread.message.delta') {
      enqueueJson({
        controller,
        value: toolCallOutputDelta({
          target: {
            runId: run.id,
            // TODO: proper id
            // Prisma runs always have a run step by the time tools are called.
            runStepId: latestRunStep!.id,
            toolCallId: toolCall.id,
            index,
          },
          output: deltaText({ delta: event.data.delta }),
        }),
      })
    }

    if (event.event === 'thread.message.completed') {
      onThreadMessageCompleted({
        message: event.data,
      })
    }
  }
}
