import type { McpConnection } from '@/types'

// Whether the connected MCP server lists a tool with the given name.
export const hasMcpTool = async ({
  mcpConnection: { client },
  toolName,
}: {
  mcpConnection: McpConnection
  toolName: string
}) => {
  const { tools } = await client.listTools()

  return Boolean(tools.find((tool) => tool.name === toolName))
}
