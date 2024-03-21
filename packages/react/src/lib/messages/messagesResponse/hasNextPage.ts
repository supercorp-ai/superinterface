import OpenAI from 'openai'
import { limit } from './limit'

export const hasNextPage = ({
  messagesResponse,
}: {
  messagesResponse: OpenAI.CursorPage<OpenAI.Beta.Threads.Messages.Message>
}) => {
  if (messagesResponse.data.length < limit) return false

  return messagesResponse.hasNextPage()
}
