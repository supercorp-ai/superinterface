import {
  failToolCall,
  type ToolCallLogScope,
} from '@/lib/toolCalls/failToolCall'
import type { FunctionCall, FunctionHandler, FunctionOutput } from '../types'
import { functionHandlers } from './functionHandlers'

// Runs the handler for the function's handler type, failing the tool call
// when the handler's row for that type is missing.
export const runFunctionHandler = async ({
  handler,
  call,
  scope,
}: {
  handler: FunctionHandler
  call: FunctionCall
  scope: ToolCallLogScope
}): Promise<FunctionOutput> => {
  const { label, handle } = functionHandlers[handler.type]
  const output = handle({ handler, call })

  if (output) return output

  const { toolCall, prisma } = call
  const message = `Function ${toolCall.function.name} has no ${label} handler.`

  return failToolCall({ toolCall, scope, message, output: message, prisma })
}
