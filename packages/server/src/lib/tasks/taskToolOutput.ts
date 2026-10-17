import OpenAI from 'openai'

export const taskToolOutput = ({
  toolCall,
  output,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  output: string
}) => ({ tool_call_id: toolCall.id, output })
