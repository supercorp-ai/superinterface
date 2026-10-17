import { Prisma, ToolType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const relationByType = {
  [ToolType.FILE_SEARCH]: 'fileSearchTool',
  [ToolType.WEB_SEARCH]: 'webSearchTool',
  [ToolType.CODE_INTERPRETER]: 'codeInterpreterTool',
  [ToolType.IMAGE_GENERATION]: 'imageGenerationTool',
  [ToolType.COMPUTER_USE]: 'computerUseTool',
} as const

// Adds a native tool (file search, web search, code interpreter, image
// generation or computer use) with its config row to an assistant.
export const createTestNativeTool = async ({
  assistantId,
  type,
  config = {},
}: {
  assistantId: string
  type: ToolType
  config?: Record<string, unknown>
}) =>
  prisma.tool.create({
    data: {
      assistantId,
      type,
      [relationByType[type]]: { create: config },
    } as Prisma.ToolUncheckedCreateInput,
  })
