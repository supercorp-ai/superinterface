import type { Prisma, StorageProviderType } from '@prisma/client'
import { isAssistantsApiStorageProvider } from '@/lib/storageProviders/isAssistantsApiStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'

const fileSearchToolType = 'file_search' as const

export const serializeFileSearchTool = ({
  tool,
  storageProviderType,
}: {
  tool: Prisma.ToolGetPayload<{ include: { fileSearchTool: true } }>
  storageProviderType: StorageProviderType
}) => {
  if (isAssistantsApiStorageProvider({ storageProviderType })) {
    return { type: fileSearchToolType }
  }

  if (!isResponsesStorageProvider({ storageProviderType })) {
    return []
  }

  const { vectorStoreIds, maxNumResults } = tool.fileSearchTool!

  // Azure Responses API requires at least one vector store ID
  // If empty, don't include the file_search tool at all
  if (vectorStoreIds.length === 0) {
    return []
  }

  return {
    type: fileSearchToolType,
    file_search: {
      vector_store_ids: vectorStoreIds,
      max_num_results: maxNumResults,
    },
  }
}
