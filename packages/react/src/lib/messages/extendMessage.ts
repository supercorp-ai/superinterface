import OpenAI from 'openai'
import { getRunSteps } from '@/lib/runSteps/getRunSteps'

type Args = {
  message: OpenAI.Beta.Threads.Messages.ThreadMessage
}

export const extendMessage = async ({
  message,
}: Args) => {
  if (!message.run_id) {
    return {
      ...message,
      runSteps: [],
    }
  }

  return {
    ...message,
    runSteps: await getRunSteps({
      threadId: message.thread_id,
      runId: message.run_id,
    }),
  }
}
