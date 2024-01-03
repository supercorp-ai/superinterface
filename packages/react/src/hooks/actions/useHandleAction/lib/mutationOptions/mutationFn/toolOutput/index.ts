import OpenAI from 'openai'
import { Functions } from '@/types'

type Args = {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  latestRun: OpenAI.Beta.Threads.Runs.Run
  functions: Functions
}

export const toolOutput = async ({
  toolCall,
  latestRun,
  functions,
}: Args) => {
  const fn = functions[toolCall.function.name]

  if (!fn) {
    console.log({ toolCall })
    throw new Error(`No function for ${toolCall.function.name}`)
  }

  return {
    tool_call_id: toolCall.id,
    output: await fn({
      toolCall,
      latestRun,
    }),
  }
}
