import {
  failToolCall,
  type ToolCallLogScope,
} from '@/lib/toolCalls/failToolCall'
import { rejectToolCall } from '@/lib/toolCalls/rejectToolCall'
import { getToolCallMcpServer } from '@/lib/mcpServers/getToolCallMcpServer'
import { NO_ARGUMENTS, parseFunctionArguments } from '../parseFunctionArguments'
import type { FunctionCall, FunctionOutput } from '../types'
import { mcpToolFailureMessage } from './mcpToolFailureMessage'
import { callMcpTool } from './callMcpTool'

// Handles a function the assistant doesn't define by calling the tool of the
// same name on one of its MCP servers.
export const handleMcpServerTool = async ({
  call: { toolCall, assistant, thread, prisma },
  scope,
}: {
  call: FunctionCall
  scope: ToolCallLogScope
}): Promise<FunctionOutput> => {
  const { mcpConnection, error } = await getToolCallMcpServer({
    toolCall,
    assistant,
    thread,
    prisma,
  })

  if (!mcpConnection) {
    const message = mcpToolFailureMessage({ toolCall, error })

    return failToolCall({ toolCall, scope, message, output: message, prisma })
  }

  const parsed = parseFunctionArguments({
    json: toolCall.function.arguments || NO_ARGUMENTS,
  })

  if (!parsed.ok) {
    const message = `Failed parsing function arguments: ${parsed.error.message}`

    return rejectToolCall({
      toolCall,
      scope,
      message,
      output: message,
      prisma,
    })
  }

  try {
    return {
      tool_call_id: toolCall.id,
      output: await callMcpTool({ mcpConnection, toolCall, args: parsed.args }),
    }
  } catch (e) {
    // MCP SDK and transport failures are Error instances.
    const message = mcpToolFailureMessage({ toolCall, error: e as Error })

    return failToolCall({ toolCall, scope, message, output: message, prisma })
  }
}
