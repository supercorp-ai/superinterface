import { StorageProviderType } from '@prisma/client'
import { openaiAssistantsStorageProviderTypes } from '@/lib/storageProviders/openaiAssistantsStorageProviderTypes'

export const isOpenaiAssistantsStorageProvider = ({
  storageProviderType,
}: {
  storageProviderType: StorageProviderType
}) => openaiAssistantsStorageProviderTypes.includes(storageProviderType)
