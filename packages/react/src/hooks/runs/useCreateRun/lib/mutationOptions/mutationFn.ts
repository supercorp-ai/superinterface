import { Run } from '@/types'
import { client } from '@/lib/ai'

export type Args = {
  threadId: string
  assistantId: string
}

export type Response = {
  run: Run
}

export const mutationFn = async ({
  threadId,
  assistantId,
}: Args): Promise<Response> => {
  const run = await client.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
    // model: 'gpt-3.5-turbo-1106',
  })

  return {
    run,
  }
}
