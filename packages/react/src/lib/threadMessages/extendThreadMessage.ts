import OpenAI from 'openai'
import { getRunSteps } from '@/lib/runSteps/getRunSteps'

type Args = {
  threadMessage: OpenAI.Beta.Threads.Messages.ThreadMessage
  client: OpenAI
}

export const extendThreadMessage = async ({
  threadMessage,
  client,
}: Args) => {
  if (!threadMessage.run_id) {
    return {
      ...threadMessage,
      runSteps: [],
    }
  }

  return {
    ...threadMessage,
    runSteps: await getRunSteps({
      threadId: threadMessage.thread_id,
      runId: threadMessage.run_id,
      client,
    }),
  }
}
