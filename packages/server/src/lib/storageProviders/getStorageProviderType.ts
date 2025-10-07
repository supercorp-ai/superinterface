import {
  ModelProvider,
  StorageProviderType,
  ModelProviderType,
} from '@prisma/client'

export const getStorageProviderType = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  if (modelProvider.type === ModelProviderType.OPENAI) {
    return StorageProviderType.OPENAI
  }

  if (modelProvider.type === ModelProviderType.AZURE_OPENAI) {
    return StorageProviderType.AZURE_OPENAI
  }

  return null
}
