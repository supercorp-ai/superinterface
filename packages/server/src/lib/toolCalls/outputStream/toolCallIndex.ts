import type OpenAI from 'openai'

// The tool call's position among the tool calls the run requires, or 0 when
// the run requires none.
export const toolCallIndex = ({
  run: { required_action: requiredAction },
  toolCall: { id },
}: {
  run: OpenAI.Beta.Threads.Runs.Run
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}) =>
  requiredAction?.submit_tool_outputs.tool_calls.findIndex(
    (requiredToolCall) => requiredToolCall.id === id,
  ) ?? 0
