import { NextResponse } from 'next/server'
import type { LogRequestMethod, PrismaClient } from '@prisma/client'
import { logMessagesError } from '@/lib/logs/logMessagesError'

export const messagesErrorResponse = ({
  prisma,
  requestMethod,
  status,
  logMessage,
  error,
  workspaceId,
  assistantId,
  threadId,
}: {
  prisma: PrismaClient
  requestMethod: LogRequestMethod
  status: number
  logMessage: string
  error: string
  workspaceId: string
  assistantId?: string
  threadId?: string
}) => {
  logMessagesError({
    prisma,
    requestMethod,
    status,
    message: logMessage,
    workspaceId,
    assistantId,
    threadId,
  })

  return NextResponse.json({ error }, { status })
}
