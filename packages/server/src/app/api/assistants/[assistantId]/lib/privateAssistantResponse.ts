import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { invalidApiKeyResponse } from '@/lib/apiKeys/invalidApiKeyResponse'
import { assistantWhere } from '@/lib/assistants/assistantWhere'
import { apiAssistantInclude } from '@/lib/assistants/apiAssistantInclude'
import { apiAssistantResponse } from '@/lib/assistants/apiAssistantResponse'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'

export const privateAssistantResponse = async ({
  prisma,
  authorization,
  assistantId,
}: {
  prisma: PrismaClient
  authorization: string
  assistantId: string
}) => {
  const privateApiKey = await getApiKey({
    authorization,
    type: ApiKeyType.PRIVATE,
    prisma,
  })

  if (!privateApiKey) {
    return invalidApiKeyResponse()
  }

  const assistant = await prisma.assistant.findUnique({
    where: assistantWhere({
      assistantId,
      workspaceId: privateApiKey.workspaceId,
    }),
    include: apiAssistantInclude,
  })

  if (!assistant) {
    return noAssistantFoundResponse()
  }

  return apiAssistantResponse({ assistant })
}
