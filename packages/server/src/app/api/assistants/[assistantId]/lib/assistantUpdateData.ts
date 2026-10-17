import type { Prisma, StorageProviderType } from '@prisma/client'
import type { z } from 'zod'
import type { updateAssistantSchema } from './updateAssistantSchema'
import { storageProviderAssistantIdData } from './storageProviderAssistantIdData'
import { nativeToolsUpdate } from './nativeToolsUpdate'

// Builds the assistant update from the fields provided in the request body.
// The storage provider assistant id goes to the column of the new storage
// provider type, or of the existing one when the type is not being changed.
export const assistantUpdateData = ({
  assistantId,
  body: {
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
  },
  existingStorageProviderType,
}: {
  assistantId: string
  body: z.infer<typeof updateAssistantSchema>
  existingStorageProviderType: StorageProviderType
}): Prisma.AssistantUpdateInput => ({
  ...(storageProviderType !== undefined && { storageProviderType }),
  ...(storageProviderAssistantId !== undefined &&
    storageProviderAssistantIdData({
      storageProviderType: storageProviderType ?? existingStorageProviderType,
      storageProviderAssistantId,
    })),
  ...(modelProviderId !== undefined && {
    modelProvider: { connect: { id: modelProviderId } },
  }),
  ...(model !== undefined && { modelSlug: model }),
  ...(name !== undefined && { name }),
  ...(description !== undefined && { description }),
  ...(instructions !== undefined && { instructions }),
  ...(truncationType !== undefined && { truncationType }),
  ...(truncationLastMessagesCount !== undefined && {
    truncationLastMessagesCount,
  }),
  tools: nativeToolsUpdate({
    assistantId,
    codeInterpreterEnabled,
    fileSearchEnabled,
  }),
})
