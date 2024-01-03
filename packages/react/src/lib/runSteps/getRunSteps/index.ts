import { client } from '@/lib/ai'

type Args = {
  threadId: string
  runId: string
}

export const getRunSteps = async ({
  threadId,
  runId,
}: Args) => {
  const runStepsResponse = await client.beta.threads.runs.steps.list(
    threadId,
    runId,
  )

  return runStepsResponse.data
}
