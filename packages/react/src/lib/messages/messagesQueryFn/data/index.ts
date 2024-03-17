import OpenAI from 'openai'
import pMap from 'p-map'
import { extendMessage } from '@/lib/messages/extendMessage'
import { runMessages } from './runMessages'

export const data = async ({
  messagesResponse,
  pageParam,
  threadId,
  client,
}: {
  messagesResponse: OpenAI.CursorPage<OpenAI.Beta.Threads.Messages.Message>
  pageParam?: string
  threadId: string
  client: OpenAI
}) => {
  const messages = await pMap(messagesResponse.data, (message) => (
    extendMessage({
      client,
      message,
    })
  ))

  if (pageParam) {
    return messages
  }

  return [
    ...await runMessages({
      messages,
      threadId,
      client,
    }),
    ...messages,
  ]
}
