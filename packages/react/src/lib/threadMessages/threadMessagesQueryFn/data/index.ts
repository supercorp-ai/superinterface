import OpenAI from 'openai'
import pMap from 'p-map'
import { extendThreadMessage } from '@/lib/threadMessages/extendThreadMessage'
import { runThreadMessages } from './runThreadMessages'

export const data = async ({
  threadMessagesResponse,
  pageParam,
  threadId,
  client,
}: {
  threadMessagesResponse: OpenAI.CursorPage<OpenAI.Beta.Threads.Messages.ThreadMessage>
  pageParam?: string
  threadId: string
  client: OpenAI
}) => {
  const threadMessages = await pMap(threadMessagesResponse.data, (threadMessage) => (
    extendThreadMessage({
      client,
      threadMessage,
    })
  ))

  if (pageParam) {
    return threadMessages
  }

  return [
    ...await runThreadMessages({
      threadMessages,
      threadId,
      client,
    }),
    ...threadMessages,
  ]
}
