import type { PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { apiAssistantInclude } from '@/lib/assistants/apiAssistantInclude'
import { apiAssistantResponse } from '@/lib/assistants/apiAssistantResponse'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import type { updateAssistantSchema } from './updateAssistantSchema'
import { assistantUpdateData } from './assistantUpdateData'

// `where` comes from authorizeAssistantRequest, so only assistants of the api
// key's workspace are found and updated.
export const updateAssistantResponse = async ({
  prisma,
  where,
  body,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
  body: z.infer<typeof updateAssistantSchema>
}) => {
  // The existing storage provider type decides where the storage provider
  // assistant id goes when the update does not change the type.
  const existingAssistant = await prisma.assistant.findUnique({
    where,
    select: {
      storageProviderType: true,
    },
  })

  if (!existingAssistant) {
    return noAssistantFoundResponse()
  }

  const assistant = await prisma.assistant.update({
    where,
    data: assistantUpdateData({
      assistantId: where.id,
      body,
      existingStorageProviderType: existingAssistant.storageProviderType,
    }),
    include: apiAssistantInclude,
  })

  return apiAssistantResponse({ assistant })
}
