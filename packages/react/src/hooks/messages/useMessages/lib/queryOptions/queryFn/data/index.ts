import OpenAI from 'openai'
import pMap from 'p-map'
import { extendMessage } from '@/lib/messages/extendMessage'
import { runMessages } from './runMessages'

export const data = async ({
  messagesResponse,
  cursor,
  threadId,
}: {
  messagesResponse: OpenAI.CursorPage<OpenAI.Beta.Threads.Messages.ThreadMessage>
  cursor?: string
  threadId: string
}) => {
  const messages = await pMap(messagesResponse.data, (message) => (
    extendMessage({
      message,
    })
  ))

  if (cursor) {
    return messages
  }

  return [
    ...await runMessages({
      messages,
      threadId,
    }),
    ...messages,
  ]
}
