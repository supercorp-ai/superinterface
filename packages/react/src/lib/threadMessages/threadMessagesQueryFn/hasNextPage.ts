import OpenAI from 'openai'
import { messagesLimit } from './messagesLimit'

export const hasNextPage = ({
  threadMessagesResponse,
}: {
  threadMessagesResponse: OpenAI.CursorPage<OpenAI.Beta.Threads.Messages.ThreadMessage>
}) => {
  if (threadMessagesResponse.data.length < messagesLimit) return false

  return threadMessagesResponse.hasNextPage()
}
