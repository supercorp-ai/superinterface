import { NextResponse } from 'next/server'
import { LogRequestMethod, type PrismaClient } from '@prisma/client'
import { messagesResponse } from '@superinterface/react/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { storageThreadId as getStorageThreadId } from '@/lib/threads/storageThreadId'
import { messagesErrorResponse } from '@/lib/logs/messagesErrorResponse'
import { initialMessagesJsonResponse } from './initialMessagesJsonResponse'
import type { findListMessagesAssistant } from './findListMessagesAssistant'

type ListMessagesAssistant = NonNullable<
  Awaited<ReturnType<typeof findListMessagesAssistant>>
>

// Lists a page of the thread's messages from its storage provider, falling
// back to the initial messages while the thread has no storage thread yet.
export const threadMessagesResponse = async ({
  assistant,
  thread,
  prisma,
  pageParam,
  before,
}: {
  assistant: ListMessagesAssistant
  thread: ListMessagesAssistant['threads'][number]
  prisma: PrismaClient
  pageParam: string | undefined
  before: string | undefined
}) => {
  const assistantClient = assistantClientAdapter({
    assistant,
    prisma,
    thread,
  })

  const storageThreadId = getStorageThreadId({
    thread,
  })

  if (!storageThreadId) {
    return initialMessagesJsonResponse({ assistant })
  }

  try {
    return NextResponse.json(
      await messagesResponse({
        threadId: storageThreadId,
        client: assistantClient,
        ...(pageParam ? { pageParam } : {}),
        ...(before ? { before } : {}),
      }),
      {
        headers: cacheHeaders,
      },
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.dir({ error }, { depth: null })

    return messagesErrorResponse({
      prisma,
      requestMethod: LogRequestMethod.GET,
      status: 500,
      logMessage: `Failed to load messages: ${error.message}`,
      error: 'Failed to load messages.',
      workspaceId: assistant.workspaceId,
      assistantId: assistant.id,
      threadId: thread.id,
    })
  }
}
