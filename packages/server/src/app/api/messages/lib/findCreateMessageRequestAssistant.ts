import type { NextResponse } from 'next/server'
import {
  LogRequestMethod,
  type Prisma,
  type PrismaClient,
} from '@prisma/client'
import { messagesErrorResponse } from '@/lib/logs/messagesErrorResponse'
import { assistantRequestErrorResponse } from './assistantRequestErrorResponse'
import { hasMessageContent } from './hasMessageContent'
import { findCreateMessageAssistant } from './findCreateMessageAssistant'
import { isAssistantSetupIncomplete } from './isAssistantSetupIncomplete'
import type { CreateMessageAssistant } from './createMessageAssistant'
import type { UserMessageInput } from './parseCreateMessageBody'

type FoundCreateMessageRequestAssistant =
  | { assistant: CreateMessageAssistant; errorResponse: null }
  | { errorResponse: NextResponse }

// Checks a new message has an assistant to go to and something to say, and
// finds that assistant once it is set up.
export const findCreateMessageRequestAssistant = async ({
  prisma,
  workspaceAccessWhere,
  assistantId,
  threadId,
  message,
}: {
  prisma: PrismaClient
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
  assistantId: string | undefined
  threadId: string | undefined
  message: UserMessageInput
}): Promise<FoundCreateMessageRequestAssistant> => {
  // These errors are logged with the same message the client gets.
  const requestErrorResponse = async ({ error }: { error: string }) => ({
    errorResponse: await assistantRequestErrorResponse({
      prisma,
      workspaceAccessWhere,
      logMessage: error,
      error,
    }),
  })

  if (!assistantId) {
    return requestErrorResponse({ error: 'No assistantId found.' })
  }

  if (!hasMessageContent(message)) {
    return requestErrorResponse({ error: 'No content found.' })
  }

  const assistant = await findCreateMessageAssistant({
    prisma,
    assistantId,
    workspaceAccessWhere,
    threadId,
  })

  if (!assistant) {
    return requestErrorResponse({ error: 'No assistant found.' })
  }

  if (isAssistantSetupIncomplete({ assistant })) {
    return {
      errorResponse: messagesErrorResponse({
        prisma,
        requestMethod: LogRequestMethod.POST,
        status: 400,
        logMessage: 'Assistant setup is not done.',
        error: 'Assistant setup is not done.',
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
      }),
    }
  }

  return { assistant, errorResponse: null }
}
