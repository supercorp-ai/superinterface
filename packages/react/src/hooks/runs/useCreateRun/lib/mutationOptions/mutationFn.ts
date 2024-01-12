import { Run } from '@/types'
import { defaultClient } from '@/lib/ai'

export type Args = {
  client?: typeof defaultClient
  threadId: string
  assistantId: string
  model?: string
}

export type Response = {
  run: Run
}

export const mutationFn = async ({
  client = defaultClient,
  model,
  threadId,
  assistantId,
}: Args): Promise<Response> => {
  const run = await client.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
    model,
  })

  return {
    run,
  }
}
