import type { StorageProviderType } from '@prisma/client'
import { ModelProviderType } from '@prisma/client'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'

const anthropicWebSearchToolType = 'web_search_20250305' as const

export const serializeWebSearchTool = ({
  storageProviderType,
  modelProviderType,
}: {
  storageProviderType: StorageProviderType
  modelProviderType: ModelProviderType
}) => {
  if (isResponsesStorageProvider({ storageProviderType })) {
    return { type: 'web_search' as const }
  }

  if (modelProviderType !== ModelProviderType.ANTHROPIC) {
    return []
  }

  return {
    type: anthropicWebSearchToolType,
    [anthropicWebSearchToolType]: {
      name: 'web_search',
    },
  }
}
