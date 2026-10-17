import type OpenAI from 'openai'
import type { PrismaClient } from '@prisma/client'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import type { ThreadVariables } from '@/lib/threads/threadVariables'
import type { content as getContent } from '@/lib/messages/content'
import { createUserMessage } from './createUserMessage'
import { startRunStream } from './startRunStream'
import { createMessageStreamResponse } from './createMessageStreamResponse'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'

// Adds the user's message to the storage thread and streams the run that
// answers it.
export const streamUserMessage = async ({
  assistant,
  preparedThread: { thread, isThreadCreated, storageThreadId },
  content,
  attachments,
  variables,
  prisma,
  signal,
}: {
  assistant: CreateMessageAssistant
  preparedThread: {
    thread: CreateMessageThread
    isThreadCreated: boolean
    storageThreadId: string
  }
  content: Awaited<ReturnType<typeof getContent>>
  attachments: OpenAI.Beta.Threads.MessageCreateParams['attachments']
  variables: ThreadVariables
  prisma: PrismaClient
  signal: AbortSignal
}) => {
  const assistantClient = assistantClientAdapter({
    assistant,
    prisma,
    thread,
  })

  const createMessageErrorResponse = await createUserMessage({
    assistantClient,
    storageThreadId,
    content,
    attachments,
    variables,
    assistant,
    thread,
    prisma,
  })

  if (createMessageErrorResponse) return createMessageErrorResponse

  const runStream = await startRunStream({
    assistantClient,
    storageThreadId,
    assistant,
    thread,
    prisma,
  })

  if (runStream.errorResponse) return runStream.errorResponse

  return createMessageStreamResponse({
    assistantClient,
    createRunStream: runStream.createRunStream,
    assistant,
    thread,
    isThreadCreated,
    prisma,
    signal,
  })
}
