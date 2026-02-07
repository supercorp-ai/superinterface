import { Prisma } from '@prisma/client'

export const toolInclude = {
  fileSearchTool: true,
  webSearchTool: true,
  codeInterpreterTool: true,
  imageGenerationTool: true,
  computerUseTool: true,
} as const

export const serializeApiTool = ({
  tool,
}: {
  tool: Prisma.ToolGetPayload<{
    include: typeof toolInclude
  }>
}) => ({
  id: tool.id,
  type: tool.type,
  ...(tool.fileSearchTool
    ? {
        fileSearchTool: {
          vectorStoreIds: tool.fileSearchTool.vectorStoreIds,
          maxNumResults: tool.fileSearchTool.maxNumResults,
        },
      }
    : {}),
  ...(tool.webSearchTool ? { webSearchTool: {} } : {}),
  ...(tool.codeInterpreterTool ? { codeInterpreterTool: {} } : {}),
  ...(tool.imageGenerationTool
    ? {
        imageGenerationTool: {
          model: tool.imageGenerationTool.model,
          quality: tool.imageGenerationTool.quality,
          size: tool.imageGenerationTool.size,
          outputFormat: tool.imageGenerationTool.outputFormat,
          background: tool.imageGenerationTool.background,
          partialImages: tool.imageGenerationTool.partialImages,
        },
      }
    : {}),
  ...(tool.computerUseTool
    ? {
        computerUseTool: {
          displayWidth: tool.computerUseTool.displayWidth,
          displayHeight: tool.computerUseTool.displayHeight,
          environment: tool.computerUseTool.environment,
          mcpServerId: tool.computerUseTool.mcpServerId,
        },
      }
    : {}),
  createdAt: tool.createdAt.toISOString(),
  updatedAt: tool.updatedAt.toISOString(),
})
