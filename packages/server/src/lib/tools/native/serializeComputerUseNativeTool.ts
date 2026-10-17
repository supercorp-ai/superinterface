import type { Prisma, StorageProviderType } from '@prisma/client'
import { ModelProviderType } from '@prisma/client'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { serializeComputerUseTool } from '@/lib/tools/serializeComputerUseTool'

const anthropicComputerToolType = 'computer_20250124' as const

// Model providers that receive the computer_use_preview tool shape.
const computerUsePreviewModelProviderTypes: ModelProviderType[] = [
  ModelProviderType.OPEN_ROUTER,
  ModelProviderType.GOOGLE,
  ModelProviderType.OLLAMA,
]

export const serializeComputerUseNativeTool = ({
  tool,
  storageProviderType,
  modelProviderType,
  useOpenaiComputerTool,
}: {
  tool: Prisma.ToolGetPayload<{ include: { computerUseTool: true } }>
  storageProviderType: StorageProviderType
  modelProviderType: ModelProviderType
  useOpenaiComputerTool: boolean
}) => {
  const computerUseTool = tool.computerUseTool!

  if (!computerUseTool.mcpServerId) {
    return []
  }

  if (isResponsesStorageProvider({ storageProviderType })) {
    return serializeComputerUseTool({
      tool,
      useOpenaiComputerTool,
    })
  }

  if (modelProviderType === ModelProviderType.ANTHROPIC) {
    return {
      type: anthropicComputerToolType,
      [anthropicComputerToolType]: {
        name: 'computer',
        display_width_px: computerUseTool.displayWidth,
        display_height_px: computerUseTool.displayHeight,
      },
    }
  }

  if (!computerUsePreviewModelProviderTypes.includes(modelProviderType)) {
    return []
  }

  return serializeComputerUseTool({
    tool,
    useOpenaiComputerTool: false,
  })
}
