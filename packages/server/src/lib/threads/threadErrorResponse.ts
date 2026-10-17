import {
  LogRequestMethod,
  type Assistant,
  type PrismaClient,
  type Thread,
} from '@prisma/client'
import { messagesErrorResponse } from '@/lib/logs/messagesErrorResponse'

export const threadErrorResponse = ({
  prisma,
  assistant,
  thread,
  logMessage,
  error,
}: {
  prisma: PrismaClient
  assistant: Assistant
  thread: Thread
  logMessage: string
  error: string
}) =>
  messagesErrorResponse({
    prisma,
    requestMethod: LogRequestMethod.POST,
    status: 500,
    logMessage,
    error,
    workspaceId: assistant.workspaceId,
    assistantId: assistant.id,
    threadId: thread.id,
  })
