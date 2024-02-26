import { defaultClient } from '@/lib/ai'
import { Message } from '@/types'
import { extendMessage } from '@/lib/messages/extendMessage'

export type Args = {
  client?: typeof defaultClient
  content: string
  threadId: string
}

export type Response = {
  message: Message
}

export const createMessageMutationFn = async ({
  client = defaultClient,
  content,
  threadId,
}: Args): Promise<Response> => {
  const message = await client.beta.threads.messages.create(threadId, {
    content: content,
    role: 'user',
  })

  return {
    message: await extendMessage({
      message,
      client,
    }),
  }
}
