import { LogRequestMethod, type PrismaClient } from '@prisma/client'
import { logMessagesError } from '@/lib/logs/logMessagesError'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'

const RUN_ERROR_STATUS = 500

// Logs a run that failed while its messages were streaming.
export const logRunError = ({
  prisma,
  assistant,
  thread,
  message,
}: {
  prisma: PrismaClient
  assistant: CreateMessageAssistant
  thread: CreateMessageThread
  message: string
}) =>
  logMessagesError({
    prisma,
    requestMethod: LogRequestMethod.POST,
    status: RUN_ERROR_STATUS,
    message,
    workspaceId: assistant.workspaceId,
    assistantId: assistant.id,
    threadId: thread.id,
  })
