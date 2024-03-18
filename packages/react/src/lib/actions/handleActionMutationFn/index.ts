// import OpenAI from 'openai'
// import { Stream } from 'openai/streaming'
import { AssistantStream } from 'openai/lib/AssistantStream'
import { Run, Functions } from '@/types'
import pMap from 'p-map'
import { defaultClient } from '@/lib/ai'
import { toolOutput } from './toolOutput'

export type Args = {
  client?: typeof defaultClient
  latestRun: Run
  functions?: Functions
}

export type Response = AssistantStream

export const handleActionMutationFn = async ({
  client = defaultClient,
  latestRun,
  functions = {},
}: Args): Promise<Response> => {
  if (!latestRun.required_action) {
    throw new Error('No required_action for run ${latestRun.id} with status ${latestRun.status}')
  }

  console.log('handleActions', { latestRun })

  const toolCalls = latestRun.required_action.submit_tool_outputs.tool_calls

  return client.beta.threads.runs.submitToolOutputsStream(
    latestRun.thread_id,
    latestRun.id,
    {
      tool_outputs: await pMap(toolCalls, (toolCall) => toolOutput({ toolCall, latestRun, functions })),
    },
  )
}
