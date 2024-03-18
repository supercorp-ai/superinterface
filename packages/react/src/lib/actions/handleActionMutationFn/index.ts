import OpenAI from 'openai'
import { Stream } from 'openai/streaming'
import { Run, Functions } from '@/types'
import pMap from 'p-map'
import { defaultClient } from '@/lib/ai'
import { toolOutput } from './toolOutput'

export type Args = {
  client?: typeof defaultClient
  latestRun: Run
  functions?: Functions
}

export type Response = Run | Stream<OpenAI.Beta.Assistants.AssistantStreamEvent>

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

  return client.beta.threads.runs.submitToolOutputs(
    latestRun.thread_id,
    latestRun.id,
    {
      stream: true,
      tool_outputs: await pMap(toolCalls, (toolCall) => toolOutput({ toolCall, latestRun, functions })),
    },
  )
}
