import {
  LogLevel,
  LogRequestMethod,
  LogRequestRoute,
  type PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'

const INTERNAL_SERVER_ERROR_STATUS = 500

export type ToolCallLogScope = {
  workspaceId: string
  assistantId: string
  threadId?: string
}

export type FailToolCallArgs = {
  toolCall: { id: string }
  scope: ToolCallLogScope
  message: string
  output: string
  // The HTTP status logged; failures are server errors unless stated.
  status?: number
  prisma: PrismaClient
}

// Logs a failed tool call and returns the tool output sent back to the model.
export const failToolCall = ({
  toolCall,
  scope,
  message,
  output,
  status = INTERNAL_SERVER_ERROR_STATUS,
  prisma,
}: FailToolCallArgs) => {
  createLog({
    log: {
      requestMethod: LogRequestMethod.POST,
      requestRoute: LogRequestRoute.MESSAGES,
      level: LogLevel.ERROR,
      status,
      message,
      ...scope,
    },
    prisma,
  })

  return {
    tool_call_id: toolCall.id,
    output,
  }
}
