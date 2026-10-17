import type { FakeLlmRequest } from './startFakeLlm'

// Returns the tool outputs the server sent back to the model in `request`,
// ordered like the assistant's tool calls and keyed by function name.
export const toolOutputs = ({ request }: { request: FakeLlmRequest }) => {
  const messages: Array<{
    role: string
    content?: string
    tool_call_id?: string
    tool_calls?: Array<{ id: string; function: { name: string } }>
  }> = request.body.messages

  const toolCalls = messages
    .filter(({ role, tool_calls }) => role === 'assistant' && tool_calls)
    .flatMap(({ tool_calls }) => tool_calls ?? [])

  return toolCalls.map(({ id, function: { name } }) => ({
    name,
    output: messages.find(
      ({ role, tool_call_id }) => role === 'tool' && tool_call_id === id,
    )?.content,
  }))
}
