import { StorageProviderType, TruncationType } from '@prisma/client'
import { z } from 'zod'

export const updateAssistantSchema = z
  .object({
    storageProviderType: z.nativeEnum(StorageProviderType).optional(),
    storageProviderAssistantId: z.string().nullable().optional(),
    modelProviderId: z.string().optional(),
    model: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    instructions: z.string().optional(),
    codeInterpreterEnabled: z.boolean().optional(),
    fileSearchEnabled: z.boolean().optional(),
    truncationType: z.nativeEnum(TruncationType).optional(),
    truncationLastMessagesCount: z.number().int().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.storageProviderType) return

    if (
      data.storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD &&
      data.storageProviderAssistantId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'storageProviderAssistantId should not be provided for SUPERINTERFACE_CLOUD',
        path: ['storageProviderAssistantId'],
      })
    }

    if (
      data.storageProviderType !== StorageProviderType.SUPERINTERFACE_CLOUD &&
      !data.storageProviderAssistantId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'storageProviderAssistantId is required for this storage provider',
        path: ['storageProviderAssistantId'],
      })
    }
  })
