import type {
  Prisma,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { ToolType } from '@prisma/client'
import { serializeFileSearchTool } from '@/lib/tools/native/serializeFileSearchTool'
import { serializeCodeInterpreterTool } from '@/lib/tools/native/serializeCodeInterpreterTool'
import { serializeImageGenerationTool } from '@/lib/tools/native/serializeImageGenerationTool'
import { serializeWebSearchTool } from '@/lib/tools/native/serializeWebSearchTool'
import { serializeComputerUseNativeTool } from '@/lib/tools/native/serializeComputerUseNativeTool'

export type NativeToolSerializerArgs = {
  tool: Prisma.ToolGetPayload<{
    include: {
      fileSearchTool: true
      imageGenerationTool: true
      computerUseTool: true
    }
  }>
  storageProviderType: StorageProviderType
  modelProviderType: ModelProviderType
  useOpenaiComputerTool: boolean
}

// Each serializer returns the tool entry, or [] when the tool is not
// supported for the assistant's storage and model provider.
export const nativeToolSerializers: Record<
  ToolType,
  (args: NativeToolSerializerArgs) => unknown
> = {
  [ToolType.FILE_SEARCH]: serializeFileSearchTool,
  [ToolType.CODE_INTERPRETER]: serializeCodeInterpreterTool,
  [ToolType.IMAGE_GENERATION]: serializeImageGenerationTool,
  [ToolType.WEB_SEARCH]: serializeWebSearchTool,
  [ToolType.COMPUTER_USE]: serializeComputerUseNativeTool,
}
