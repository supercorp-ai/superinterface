import { LogRequestMethod, type PrismaClient } from '@prisma/client'
import type { NextResponse } from 'next/server'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { createThread } from '@/lib/threads/createThread'
import { messagesErrorResponse } from '@/lib/logs/messagesErrorResponse'
import type { ThreadVariables } from '@/lib/threads/threadVariables'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'
import type { OnSuccessCreateThread } from './onSuccessCreateThread'

type FoundOrCreatedThread =
  | {
      thread: CreateMessageThread
      isThreadCreated: boolean
      errorResponse: null
    }
  | { errorResponse: NextResponse }

export const findOrCreateThread = async ({
  assistant,
  prisma,
  variables,
  onSuccessCreateThread,
}: {
  assistant: CreateMessageAssistant
  prisma: PrismaClient
  variables: ThreadVariables
  onSuccessCreateThread: OnSuccessCreateThread
}): Promise<FoundOrCreatedThread> => {
  const existingThread = assistant.threads[0]

  if (existingThread) {
    return {
      thread: existingThread,
      isThreadCreated: false,
      errorResponse: null,
    }
  }

  const createThreadClient = assistantClientAdapter({ assistant, prisma })

  try {
    const thread = await createThread({
      client: createThreadClient,
      assistant,
      prisma,
      variables,
    })

    onSuccessCreateThread({ thread })

    return { thread, isThreadCreated: true, errorResponse: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.dir(error, { depth: null })

    return {
      errorResponse: messagesErrorResponse({
        prisma,
        requestMethod: LogRequestMethod.POST,
        status: 500,
        logMessage: `Failed to create thread: ${error.message}`,
        error: 'Failed to create thread.',
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
      }),
    }
  }
}
