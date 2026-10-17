import type { z } from 'zod'
import type { Prisma, PrismaClient } from '@prisma/client'
import { assistantRequestErrorResponse } from './assistantRequestErrorResponse'
import { findListMessagesAssistant } from './findListMessagesAssistant'
import { initialMessagesJsonResponse } from './initialMessagesJsonResponse'
import { threadMessagesResponse } from './threadMessagesResponse'
import type { listMessagesParamsSchema } from './listMessagesParamsSchema'

type ListMessagesParams = Omit<
  z.infer<typeof listMessagesParamsSchema>,
  'publicApiKey'
>

// Lists the requested thread's messages, or the assistant's initial messages
// when no thread of the assistant is requested.
export const listMessagesResponse = async ({
  prisma,
  workspaceAccessWhere,
  assistantId,
  threadId,
  pageParam,
  before,
}: ListMessagesParams & {
  prisma: PrismaClient
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
}) => {
  if (!assistantId) {
    return assistantRequestErrorResponse({
      prisma,
      workspaceAccessWhere,
      logMessage: 'No assistantId found.',
      error: 'No assistant id found',
    })
  }

  const assistant = await findListMessagesAssistant({
    prisma,
    assistantId,
    workspaceAccessWhere,
    threadId,
  })

  if (!assistant) {
    return assistantRequestErrorResponse({
      prisma,
      workspaceAccessWhere,
      logMessage: 'No assistant found.',
      error: 'No assistant found',
    })
  }

  const thread = assistant.threads[0]

  if (!threadId || !thread) {
    return initialMessagesJsonResponse({ assistant })
  }

  return threadMessagesResponse({
    assistant,
    thread,
    prisma,
    pageParam,
    before,
  })
}
