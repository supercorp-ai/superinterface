import type { StorageProviderType } from '@prisma/client'
import { ModelProviderType } from '@prisma/client'
import { isAssistantsApiStorageProvider } from '@/lib/storageProviders/isAssistantsApiStorageProvider'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'

const codeInterpreterToolType = 'code_interpreter' as const
const anthropicCodeExecutionToolType = 'code_execution_20250825' as const

export const serializeCodeInterpreterTool = ({
  storageProviderType,
  modelProviderType,
}: {
  storageProviderType: StorageProviderType
  modelProviderType: ModelProviderType
}) => {
  if (isAssistantsApiStorageProvider({ storageProviderType })) {
    return { type: codeInterpreterToolType }
  }

  if (isResponsesStorageProvider({ storageProviderType })) {
    return {
      type: codeInterpreterToolType,
      code_interpreter: {
        container: {
          type: 'auto' as const,
        },
      },
    }
  }

  if (modelProviderType !== ModelProviderType.ANTHROPIC) {
    return []
  }

  return {
    type: anthropicCodeExecutionToolType,
    [anthropicCodeExecutionToolType]: {
      name: 'code_execution',
    },
  }
}
