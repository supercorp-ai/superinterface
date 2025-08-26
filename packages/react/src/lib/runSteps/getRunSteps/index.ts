import OpenAI from 'openai'

type Args = {
  threadId: string
  runId: string
  client: OpenAI
}

export const getRunSteps = async ({ threadId, runId, client }: Args) => {
  const runStepsResponse = await client.beta.threads.runs.steps.list(runId, {
    thread_id: threadId,
  })

  return runStepsResponse.data
}
