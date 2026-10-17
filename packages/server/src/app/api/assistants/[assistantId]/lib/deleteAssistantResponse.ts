import type { PrismaClient } from '@prisma/client'
import { apiAssistantInclude } from '@/lib/assistants/apiAssistantInclude'
import { apiAssistantResponse } from '@/lib/assistants/apiAssistantResponse'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'

// `where` comes from authorizeAssistantRequest, so only assistants of the api
// key's workspace are found and deleted.
export const deleteAssistantResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
}) => {
  const assistant = await prisma.assistant.findFirst({
    where,
    include: apiAssistantInclude,
  })

  if (!assistant) {
    return noAssistantFoundResponse()
  }

  await prisma.assistant.delete({
    where: {
      id: assistant.id,
    },
  })

  return apiAssistantResponse({ assistant })
}
