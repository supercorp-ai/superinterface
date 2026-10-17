import { ToolType } from '@prisma/client'
import type { z } from 'zod'
import type { toolSchema } from '@/lib/tools/toolSchema'

// Creates the configuration of the tool's type, from the request body where
// the type has one and with defaults otherwise.
export const toolCreateData = ({
  body: { type, fileSearchTool, imageGenerationTool, computerUseTool },
}: {
  body: z.infer<typeof toolSchema>
}) => {
  if (type === ToolType.FILE_SEARCH) {
    return { fileSearchTool: { create: fileSearchTool ?? {} } }
  }

  if (type === ToolType.WEB_SEARCH) {
    return { webSearchTool: { create: {} } }
  }

  if (type === ToolType.CODE_INTERPRETER) {
    return { codeInterpreterTool: { create: {} } }
  }

  if (type === ToolType.IMAGE_GENERATION) {
    return { imageGenerationTool: { create: imageGenerationTool ?? {} } }
  }

  return { computerUseTool: { create: computerUseTool ?? {} } }
}
