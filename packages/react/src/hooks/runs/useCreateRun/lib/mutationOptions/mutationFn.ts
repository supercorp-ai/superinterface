import OpenAI from 'openai'
import { Run } from '@/types'
import { defaultClient } from '@/lib/ai'

export type Args = {
  client?: typeof defaultClient
  threadId: string
  assistantId: string
} & OpenAI.Beta.Threads.Runs.RunCreateParams

export type Response = {
  run: Run
}

export const mutationFn = async ({
  client = defaultClient,
  model,
  threadId,
  assistantId,
  ...rest
}: Args): Promise<Response> => {
  const run = await client.beta.threads.runs.create(threadId, {
    ...rest,
    assistant_id: assistantId,
  })

  return {
    run,
  }
}
