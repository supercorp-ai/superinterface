import OpenAI from 'openai'
import type { RunStep } from 'openai/resources/beta/threads/runs/steps'

type Args = {
  threadId: string
  runId: string
  client: OpenAI
}

export const getRunSteps = async ({
  threadId,
  runId,
  client,
}: Args): Promise<RunStep[]> => {
  // The generated OpenAI types still expect the deprecated threadId parameter order.
  // @ts-expect-error - runtime API requires the documented `thread_id` payload
  const runStepsResponse = await client.beta.threads.runs.steps.list(runId, {
    thread_id: threadId,
  })

  return runStepsResponse.data
}
