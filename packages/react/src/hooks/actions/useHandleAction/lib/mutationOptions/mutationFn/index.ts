import { Run, Functions } from '@/types'
import pMap from 'p-map'
import { client } from '@/lib/ai'
import { toolOutput } from './toolOutput'

export type Args = {
  latestRun: Run
  functions?: Functions
}

export type Response = {
  run: Run
}

export const mutationFn = async ({
  latestRun,
  functions = {},
}: Args): Promise<Response> => {
  if (!latestRun.required_action) {
    throw new Error('No required_action for run ${latestRun.id} with status ${latestRun.status}')
  }

  console.log('handleActions', { latestRun })

  const toolCalls = latestRun.required_action.submit_tool_outputs.tool_calls

  const run = await client.beta.threads.runs.submitToolOutputs(
    latestRun.thread_id,
    latestRun.id,
    {
      tool_outputs: await pMap(toolCalls, (toolCall) => toolOutput({ toolCall, latestRun, functions })),
    },
  )

  return {
    run,
  }
}
