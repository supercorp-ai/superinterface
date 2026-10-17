import type { Assistant, Thread } from '@prisma/client'
import type { ToolCallLogScope } from './failToolCall'

// Scopes tool call logs to the assistant and thread that made the call.
export const toolCallLogScope = ({
  assistant,
  thread,
}: {
  assistant: Assistant
  thread: Thread
}): ToolCallLogScope => ({
  workspaceId: assistant.workspaceId,
  assistantId: assistant.id,
  threadId: thread.id,
})
