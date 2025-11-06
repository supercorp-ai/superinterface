import { StorageProviderType } from '@prisma/client'
import { azureAgentsStorageProviderTypes } from '@/lib/storageProviders/azureAgentsStorageProviderTypes'

export const isAzureAgentsStorageProvider = ({
  storageProviderType,
}: {
  storageProviderType: StorageProviderType
}) => azureAgentsStorageProviderTypes.includes(storageProviderType)
