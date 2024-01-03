import { client } from '@/lib/ai'
import { Message } from '@/types'
import { extendMessage } from '@/lib/messages/extendMessage'

export type Args = {
  content: string
  threadId: string
}

export type Response = {
  message: Message
}

export const mutationFn = async ({ content, threadId }: Args): Promise<Response> => {
  const message = await client.beta.threads.messages.create(threadId, {
    content: content,
    role: 'user',
  })

  return {
    message: await extendMessage({
      message,
    }),
  }
}
