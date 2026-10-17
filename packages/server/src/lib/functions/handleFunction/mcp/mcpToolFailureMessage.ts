import OpenAI from 'openai'

// Describes why an MCP server tool call failed: no server has the tool, or
// connecting to or calling the server threw.
export const mcpToolFailureMessage = ({
  toolCall,
  error,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  error: Error | null
}) => {
  if (!error) return `Function ${toolCall.function.name} not found.`

  return `Error calling function ${toolCall.function.name}: ${error.message}`
}
