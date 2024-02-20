import { defaultClient } from '@/lib/ai'
import { ThreadMessage } from '@/types'
import { extendThreadMessage } from '@/lib/threadMessages/extendThreadMessage'

export type Args = {
  client?: typeof defaultClient
  content: string
  threadId: string
}

export type Response = {
  threadMessage: ThreadMessage
}

export const mutationFn = async ({
  client = defaultClient,
  content,
  threadId,
}: Args): Promise<Response> => {
  const threadMessage = await client.beta.threads.messages.create(threadId, {
    content: content,
    role: 'user',
  })

  return {
    threadMessage: await extendThreadMessage({
      threadMessage,
      client,
    }),
  }
}
