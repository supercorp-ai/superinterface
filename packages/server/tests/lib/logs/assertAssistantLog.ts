import assert from 'node:assert'
import { LogLevel, LogRequestMethod, LogRequestRoute } from '@prisma/client'
import { waitForAssistantLog } from './waitForAssistantLog'

// Waits for the error log a /api/messages run writes in the background and
// checks every field the log row was created with.
export const assertAssistantLog = async ({
  assistantId,
  workspaceId,
  threadId,
  status,
  message,
}: {
  assistantId: string
  workspaceId: string
  threadId: string | null
  status: number
  message: string
}) => {
  const log = await waitForAssistantLog({
    assistantId,
    match: (log) => log.message === message,
  })

  assert.deepStrictEqual(
    {
      requestMethod: log.requestMethod,
      requestRoute: log.requestRoute,
      level: log.level,
      status: log.status,
      message: log.message,
      workspaceId: log.workspaceId,
      assistantId: log.assistantId,
      threadId: log.threadId,
    },
    {
      requestMethod: LogRequestMethod.POST,
      requestRoute: LogRequestRoute.MESSAGES,
      level: LogLevel.ERROR,
      status,
      message,
      workspaceId,
      assistantId,
      threadId,
    },
  )

  return log
}
