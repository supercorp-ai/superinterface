import OpenAI from 'openai'
import { type PrismaClient } from '@prisma/client'
import { createMessageResponse } from '@superinterface/react/server'
import { streamOutput } from '@/lib/toolCalls/streamOutput'
import { messagesToOutput } from '@/lib/toolCalls/messagesToOutput'
import { handleToolCall } from '@/lib/toolCalls/handleToolCall'
import type { HandlerConversation, ParentToolCall } from './types'

type RunStream = Awaited<
  ReturnType<OpenAI['beta']['threads']['runs']['create']>
>

// Streams the child run into the parent stream and returns the completed
// child messages as the tool output text.
export const streamHandlerMessages = async ({
  client,
  createRunStream,
  conversation: { assistant, thread },
  parent: { toolCall, controller, run },
  prisma,
}: {
  client: OpenAI
  createRunStream: RunStream
  conversation: HandlerConversation
  parent: ParentToolCall
  prisma: PrismaClient
}) => {
  const messageResponse = createMessageResponse({
    client,
    createRunStream,
    handleToolCall: handleToolCall({
      assistant,
      thread,
      prisma,
    }),
  })

  const messages: OpenAI.Beta.Threads.Messages.Message[] = []

  await streamOutput({
    toolCall,
    messageResponse,
    controller,
    run,
    prisma,
    onThreadMessageCompleted: ({ message }) => {
      messages.push(message)
    },
  })

  return messagesToOutput({
    messages,
  })
}
