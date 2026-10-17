import {
  LogLevel,
  LogRequestRoute,
  type LogRequestMethod,
  type PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'

export const logMessagesError = ({
  prisma,
  requestMethod,
  status,
  message,
  workspaceId,
  assistantId,
  threadId,
}: {
  prisma: PrismaClient
  requestMethod: LogRequestMethod
  status: number
  message: string
  workspaceId: string
  assistantId?: string
  threadId?: string
}) =>
  createLog({
    log: {
      requestMethod,
      requestRoute: LogRequestRoute.MESSAGES,
      level: LogLevel.ERROR,
      status,
      message,
      workspaceId,
      assistantId,
      threadId,
    },
    prisma,
  })
