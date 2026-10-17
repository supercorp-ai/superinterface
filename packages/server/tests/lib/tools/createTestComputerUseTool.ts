import { ToolType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Adds a COMPUTER_USE tool to an assistant, optionally backed by an MCP
// server (pass `mcpServerId: null` for an unconfigured tool).
export const createTestComputerUseTool = async ({
  assistantId,
  mcpServerId,
  displayWidth = 1024,
  displayHeight = 768,
}: {
  assistantId: string
  mcpServerId: string | null
  displayWidth?: number
  displayHeight?: number
}) =>
  prisma.tool.create({
    data: {
      assistantId,
      type: ToolType.COMPUTER_USE,
      computerUseTool: {
        create: {
          displayWidth,
          displayHeight,
          ...(mcpServerId ? { mcpServerId } : {}),
        },
      },
    },
  })
