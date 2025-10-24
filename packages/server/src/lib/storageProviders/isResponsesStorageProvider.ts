import { StorageProviderType } from '@prisma/client'
import { responsesStorageProviderTypes } from '@/lib/storageProviders/responsesStorageProviderTypes'

export const isResponsesStorageProvider = ({
  storageProviderType,
}: {
  storageProviderType: StorageProviderType
}) => responsesStorageProviderTypes.includes(storageProviderType)
