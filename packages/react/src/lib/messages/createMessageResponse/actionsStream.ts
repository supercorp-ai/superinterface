import OpenAI from 'openai'
import pMap from 'p-map'

export const actionsStream = async ({
  client,
  run,
  handleToolCall,
  controller,
}: {
  client: any
  run: OpenAI.Beta.Threads.Runs.Run
  handleToolCall: any
  controller: ReadableStreamDefaultController
}) => {
  if (!run.required_action) {
    throw new Error('Run does not have a required action')
  }

  const toolCalls = run.required_action.submit_tool_outputs.tool_calls

  return client.beta.threads.runs.submitToolOutputsStream(
    run.thread_id,
    run.id,
    {
      tool_outputs: await pMap(toolCalls, (toolCall) => (
        handleToolCall({
          toolCall,
          run,
          controller,
        }))
      ),
    },
  )
}
