import type { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { content as getContent } from '@/lib/messages/content'
import { threadErrorResponse } from '@/lib/threads/threadErrorResponse'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'

type MessageContent =
  | { content: Awaited<ReturnType<typeof getContent>>; errorResponse: null }
  | { errorResponse: NextResponse }

// The message text: the text sent, or the transcript of the audio sent.
export const getMessageContent = async ({
  textContent,
  audioContent,
  assistant,
  thread,
  prisma,
}: {
  textContent: string | undefined
  audioContent: string | undefined
  assistant: CreateMessageAssistant
  thread: CreateMessageThread
  prisma: PrismaClient
}): Promise<MessageContent> => {
  try {
    return {
      content: await getContent({
        audioContent,
        textContent,
        assistant,
      }),
      errorResponse: null,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(error)

    return {
      errorResponse: threadErrorResponse({
        prisma,
        assistant,
        thread,
        logMessage: `Failed to get content: ${error.message}`,
        error: 'Failed to get content.',
      }),
    }
  }
}
