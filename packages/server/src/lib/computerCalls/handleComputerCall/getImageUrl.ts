import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

// Returns the first image in an MCP tool result as a data URL.
export const getImageUrl = ({
  mcpServerToolOutput,
}: {
  mcpServerToolOutput: CallToolResult
}) => {
  const image = mcpServerToolOutput.content.find((c) => c.type === 'image')
  if (!image) return null

  return `data:${image.mimeType};base64,${image.data}`
}
