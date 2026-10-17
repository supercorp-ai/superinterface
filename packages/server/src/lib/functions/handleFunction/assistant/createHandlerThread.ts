import OpenAI from 'openai'
import { Thread, type PrismaClient } from '@prisma/client'
import { omit } from 'radash'
import { createThread } from '@/lib/threads/createThread'
import type { HandlerAssistant } from './findHandlerAssistant'

// The child thread inherits the parent thread variables, except the ids that
// identify the parent conversation.
export const createHandlerThread = ({
  client,
  assistant,
  parentThread,
  prisma,
}: {
  client: OpenAI
  assistant: HandlerAssistant
  parentThread: Thread
  prisma: PrismaClient
}) =>
  createThread({
    client,
    assistant,
    prisma,
    variables: {
      ...omit(parentThread.metadata ?? {}, ['assistantId', 'threadId']),
      assistantId: assistant.id,
    },
  })

export type HandlerThread = Awaited<ReturnType<typeof createHandlerThread>>
