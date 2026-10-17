import { prisma } from '@/lib/prisma'
import { assertAssistantLog } from './assertAssistantLog'

// Checks the error log written while running a message for `assistant`,
// against the (only) thread that run used.
export const assertRunLog = async ({
  assistant,
  status,
  message,
}: {
  assistant: { id: string; workspaceId: string }
  status: number
  message: string
}) => {
  const thread = await prisma.thread.findFirstOrThrow({
    where: { assistantId: assistant.id },
  })

  return assertAssistantLog({
    assistantId: assistant.id,
    workspaceId: assistant.workspaceId,
    threadId: thread.id,
    status,
    message,
  })
}
