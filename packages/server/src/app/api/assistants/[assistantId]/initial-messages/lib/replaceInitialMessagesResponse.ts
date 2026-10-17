import type { MessageRole, PrismaClient } from '@prisma/client'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { updateInitialMessages } from '@/lib/initialMessages/updateInitialMessages'
import { initialMessagesResponse } from './initialMessagesResponse'

// Replaces the assistant's initial messages. `where` comes from
// authorizeAssistantRequest, so only assistants of the api key's workspace
// are found.
export const replaceInitialMessagesResponse = async ({
  prisma,
  where,
  initialMessages,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
  initialMessages: { role: MessageRole; content: string }[]
}) => {
  const assistant = await prisma.assistant.findFirst({ where })

  if (!assistant) {
    return noAssistantFoundResponse()
  }

  return initialMessagesResponse({
    initialMessages: await updateInitialMessages({
      assistantId: assistant.id,
      initialMessages,
      prisma,
    }),
  })
}
