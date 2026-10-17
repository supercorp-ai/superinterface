import OpenAI from 'openai'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import type { McpConnection } from '@/types'
import { closeMcpConnection } from '@/lib/mcpServers/closeMcpConnection'
import type { FunctionArguments } from '../parseFunctionArguments'

const MCP_TOOL_CALL_TIMEOUT_MS = 300000

// Calls the tool on the connected MCP server, closes the connection and
// returns the serialized result.
export const callMcpTool = async ({
  mcpConnection,
  toolCall,
  args,
}: {
  mcpConnection: McpConnection
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  args: FunctionArguments
}) => {
  const result = await mcpConnection.client.callTool(
    {
      name: toolCall.function.name,
      arguments: args,
    },
    CallToolResultSchema,
    {
      timeout: MCP_TOOL_CALL_TIMEOUT_MS,
    },
  )

  await closeMcpConnection({
    mcpConnection,
  })

  return JSON.stringify(result)
}
