import { LogRequestMethod } from '@prisma/client'
import { logMessagesError } from '@/lib/logs/logMessagesError'
import type { TaskToolCallContext } from './parseTaskToolCall'
import { checkTaskToolArgs } from './checkTaskToolArgs'

// Parses a task tool call's arguments. Invalid arguments are logged for the
// workspace and returned as an error for the model.
export const parseTaskToolArgs = ({
  toolCall,
  assistant,
  thread,
  prisma,
}: TaskToolCallContext) => {
  const argsCheck = checkTaskToolArgs({ toolCall })
  if (argsCheck.ok) return { ok: true as const, args: argsCheck.value }

  logMessagesError({
    prisma,
    requestMethod: LogRequestMethod.POST,
    status: 400,
    message: argsCheck.logMessage,
    workspaceId: assistant.workspaceId,
    assistantId: assistant.id,
    threadId: thread.id,
  })

  return { ok: false as const, error: argsCheck.error }
}
