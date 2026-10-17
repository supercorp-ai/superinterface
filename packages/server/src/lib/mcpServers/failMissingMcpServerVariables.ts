import {
  LogLevel,
  LogRequestMethod,
  LogRequestRoute,
  type Assistant,
  type PrismaClient,
  type Thread,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'

// Logs the template variables an MCP server setting left unfilled and throws.
export const failMissingMcpServerVariables = ({
  missing,
  thread,
  assistant,
  prisma,
}: {
  missing: string[]
  thread: Thread
  assistant: Assistant
  prisma: PrismaClient
}): never => {
  const message = `Missing variables in MCP server: ${missing.join(', ')}`

  createLog({
    log: {
      requestMethod: LogRequestMethod.POST,
      requestRoute: LogRequestRoute.MESSAGES,
      level: LogLevel.ERROR,
      // A missing variable is a configuration error: 400 Bad Request.
      status: 400,
      message,
      workspaceId: assistant.workspaceId,
      assistantId: assistant.id,
      threadId: thread.id,
    },
    prisma,
  })

  throw new Error(message)
}
