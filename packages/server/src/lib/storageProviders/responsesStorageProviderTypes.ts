import { StorageProviderType } from '@prisma/client'

export const responsesStorageProviderTypes: StorageProviderType[] = [
  StorageProviderType.OPENAI_RESPONSES,
  StorageProviderType.AZURE_RESPONSES,
]
