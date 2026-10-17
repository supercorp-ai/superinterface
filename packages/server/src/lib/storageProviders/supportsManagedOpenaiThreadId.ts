import type { StorageProviderType } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'

export const supportsManagedOpenaiThreadId = ({
  storageProviderType,
}: {
  storageProviderType: StorageProviderType
}) =>
  isOpenaiAssistantsStorageProvider({ storageProviderType }) ||
  isResponsesStorageProvider({ storageProviderType })
