import type OpenAI from 'openai'
import type { PrismaClient } from '@prisma/client'
import { serializeMetadata } from '@/lib/metadata/serializeMetadata'
import type { content as getContent } from '@/lib/messages/content'
import { threadErrorResponse } from '@/lib/threads/threadErrorResponse'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'

// Adds the user's message to the storage thread. Returns an error response
// when that fails, and nothing once the message is created.
export const createUserMessage = async ({
  assistantClient,
  storageThreadId,
  content,
  attachments,
  variables,
  assistant,
  thread,
  prisma,
}: {
  assistantClient: OpenAI
  storageThreadId: string
  content: Awaited<ReturnType<typeof getContent>>
  attachments: OpenAI.Beta.Threads.MessageCreateParams['attachments']
  variables: Record<string, unknown>
  assistant: CreateMessageAssistant
  thread: CreateMessageThread
  prisma: PrismaClient
}) => {
  try {
    await assistantClient.beta.threads.messages.create(storageThreadId, {
      role: 'user',
      content,
      ...(attachments?.length ? { attachments } : {}),
      metadata: serializeMetadata({
        variables,
        workspaceId: assistant.workspaceId,
        prisma,
      }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log({ error })

    return threadErrorResponse({
      prisma,
      assistant,
      thread,
      logMessage: `Failed to create message: ${error.message}`,
      error: 'Failed to create message.',
    })
  }
}
