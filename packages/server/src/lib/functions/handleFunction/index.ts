import { failToolCall } from '@/lib/toolCalls/failToolCall'
import { toolCallLogScope } from '@/lib/toolCalls/toolCallLogScope'
import { getFunction } from './getFunction'
import { handleMcpServerTool } from './mcp/handleMcpServerTool'
import { runFunctionHandler } from './handlers/runFunctionHandler'
import type { FunctionCall, FunctionOutput } from './types'

// Answers a function tool call with the assistant's matching function
// handler, or with an MCP server tool when no function matches.
export const handleFunction = async (
  call: FunctionCall,
): Promise<FunctionOutput> => {
  const { toolCall, assistant, thread, prisma } = call
  const scope = toolCallLogScope({ assistant, thread })

  const fn = getFunction({
    toolCall,
    assistant,
  })

  if (!fn) return handleMcpServerTool({ call, scope })

  if (!fn.handler) {
    const message = `Function ${toolCall.function.name} has no handler.`

    return failToolCall({ toolCall, scope, message, output: message, prisma })
  }

  return runFunctionHandler({ handler: fn.handler, call, scope })
}
