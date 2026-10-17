import { StorageProviderType, TruncationType } from '@prisma/client'
import { z } from 'zod'
import { openaiAssistantsStorageProviderTypes } from '@/lib/storageProviders/openaiAssistantsStorageProviderTypes'

const storageTypesWithAssistantId: StorageProviderType[] = [
  ...openaiAssistantsStorageProviderTypes,
  StorageProviderType.AZURE_AGENTS,
]

export const createAssistantSchema = z
  .object({
    storageProviderType: z.nativeEnum(StorageProviderType),
    storageProviderAssistantId: z.string().nullable().optional(),
    modelProviderId: z.string(),
    model: z.string(),
    name: z.string().optional(),
    description: z.string().optional().default(''),
    instructions: z.string().optional().default(''),
    codeInterpreterEnabled: z.boolean().optional().default(false),
    fileSearchEnabled: z.boolean().optional().default(false),
    truncationType: z.nativeEnum(TruncationType).optional(),
    truncationLastMessagesCount: z.number().int().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Storage providers that keep the assistant on their side need its id,
    // the others must not get one.
    const needsAssistantId = storageTypesWithAssistantId.includes(
      data.storageProviderType,
    )

    if (needsAssistantId === Boolean(data.storageProviderAssistantId)) return

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: needsAssistantId
        ? 'storageProviderAssistantId is required for this storage provider'
        : 'storageProviderAssistantId should not be provided for this storage provider',
      path: ['storageProviderAssistantId'],
    })
  })
