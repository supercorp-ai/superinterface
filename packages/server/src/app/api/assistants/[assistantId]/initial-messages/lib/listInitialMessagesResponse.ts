import type { PrismaClient } from '@prisma/client'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { initialMessagesResponse } from './initialMessagesResponse'

// Lists the assistant's initial messages in order. `where` comes from
// authorizeAssistantRequest, so only assistants of the api key's workspace
// are found.
export const listInitialMessagesResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
}) => {
  const assistant = await prisma.assistant.findFirst({
    where,
    include: {
      initialMessages: {
        orderBy: {
          orderNumber: 'asc',
        },
      },
    },
  })

  if (!assistant) {
    return noAssistantFoundResponse()
  }

  return initialMessagesResponse({
    initialMessages: assistant.initialMessages,
  })
}
