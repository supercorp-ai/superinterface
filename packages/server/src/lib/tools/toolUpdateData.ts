import { ToolType } from '@prisma/client'
import type { z } from 'zod'
import type { updateToolSchema } from '@/lib/tools/toolSchema'

const upsert = <Config>(config: Config) => ({
  upsert: { create: config, update: config },
})

// Upserts the configuration of the tool's own type. Configurations sent for
// other tool types are ignored.
export const toolUpdateData = ({
  type,
  body: { fileSearchTool, imageGenerationTool, computerUseTool },
}: {
  type: ToolType
  body: z.infer<typeof updateToolSchema>
}) => {
  if (type === ToolType.FILE_SEARCH && fileSearchTool) {
    return { fileSearchTool: upsert(fileSearchTool) }
  }

  if (type === ToolType.IMAGE_GENERATION && imageGenerationTool) {
    return { imageGenerationTool: upsert(imageGenerationTool) }
  }

  if (type === ToolType.COMPUTER_USE && computerUseTool) {
    return { computerUseTool: upsert(computerUseTool) }
  }

  return {}
}
