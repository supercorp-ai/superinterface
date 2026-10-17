import type { PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { apiAssistantInclude } from '@/lib/assistants/apiAssistantInclude'
import { apiAssistantResponse } from '@/lib/assistants/apiAssistantResponse'
import type { createAssistantSchema } from './createAssistantSchema'
import { storageProviderAssistantIdCreateData } from './storageProviderAssistantIdCreateData'
import { nativeToolsCreate } from './nativeToolsCreate'

// Creates the assistant in the api key's workspace.
export const createAssistantResponse = async ({
  prisma,
  workspaceId,
  body,
}: {
  prisma: PrismaClient
  workspaceId: string
  body: z.infer<typeof createAssistantSchema>
}) => {
  const {
    storageProviderType,
    storageProviderAssistantId,
    modelProviderId,
    model,
    name,
    description,
    instructions,
    codeInterpreterEnabled,
    fileSearchEnabled,
    truncationType,
    truncationLastMessagesCount,
  } = body

  const assistant = await prisma.assistant.create({
    data: {
      workspace: { connect: { id: workspaceId } },
      modelProvider: { connect: { id: modelProviderId } },
      modelSlug: model,
      name,
      description,
      instructions,
      storageProviderType,
      ...storageProviderAssistantIdCreateData({
        storageProviderType,
        storageProviderAssistantId,
      }),
      ...(truncationType !== undefined && { truncationType }),
      ...(truncationLastMessagesCount !== undefined && {
        truncationLastMessagesCount,
      }),
      tools: nativeToolsCreate({ codeInterpreterEnabled, fileSearchEnabled }),
    },
    include: apiAssistantInclude,
  })

  return apiAssistantResponse({ assistant })
}
