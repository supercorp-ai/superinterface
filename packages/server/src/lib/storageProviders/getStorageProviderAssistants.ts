import { ModelProvider } from '@prisma/client'
import { getOpenaiAssistants } from '@/lib/openai/getOpenaiAssistants'
import { getStorageProviderType } from '@/lib/storageProviders/getStorageProviderType'

export const getStorageProviderAssistants = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  const storageProviderType = getStorageProviderType({ modelProvider })

  if (!storageProviderType) {
    return []
  }

  return getOpenaiAssistants({
    modelProvider,
  })
}
