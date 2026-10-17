import { Prisma } from '@prisma/client'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpConnection } from '@/types'
import { callComputerAction } from './callComputerAction'
import { getImageUrl } from './getImageUrl'
import { serializeScreenshot } from './serializeScreenshot'
import { SCREENSHOT_ACTION } from './constants'

// Prefers the image returned by the actions, then a fresh screenshot, and
// falls back to the raw result of the last action.
export const computerCallOutput = async ({
  mcpConnection,
  mcpServerToolOutput,
  assistant,
}: {
  mcpConnection: McpConnection
  mcpServerToolOutput: CallToolResult
  assistant: Prisma.AssistantGetPayload<{
    include: {
      modelProvider: true
    }
  }>
}) => {
  const imageUrl = getImageUrl({ mcpServerToolOutput })

  if (imageUrl) {
    return serializeScreenshot({ imageUrl, assistant })
  }

  const screenshotUrl = getImageUrl({
    mcpServerToolOutput: await callComputerAction({
      mcpConnection,
      action: SCREENSHOT_ACTION,
    }),
  })

  if (screenshotUrl) {
    return serializeScreenshot({ imageUrl: screenshotUrl, assistant })
  }

  return mcpServerToolOutput.structuredContent ?? mcpServerToolOutput.content
}
