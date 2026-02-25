import type OpenAI from 'openai'

type Args = {
  threadId: string
  runId: string
  client: OpenAI
}

export const getRunSteps = async ({ threadId, runId, client }: Args) => {
  const runSteps: OpenAI.Beta.Threads.Runs.RunStep[] = []

  for await (const runStep of client.beta.threads.runs.steps.list(runId, {
    thread_id: threadId,
  })) {
    runSteps.push(runStep)
  }

  return runSteps
}
