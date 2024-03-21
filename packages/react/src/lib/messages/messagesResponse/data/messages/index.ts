import OpenAI from 'openai'
import pMap from 'p-map'
import { extendMessage } from '@/lib/messages/extendMessage'
import { runMessages } from './runMessages'

export const messages = async ({
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
  const result = await pMap(messagesResponse.data, (message) => (
    extendMessage({
      client,
      message,
    })
  ))

  if (pageParam) {
    return result
  }

  return [
    ...await runMessages({
      result,
      threadId,
      client,
    }),
    ...result,
  ]
}
