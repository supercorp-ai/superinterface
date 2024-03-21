import OpenAI from 'openai'
import { serializeMessage } from '@/lib/messages/serializeMessage'
import { messages } from './messages'

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
}) => (
  (await messages({
    messagesResponse,
    pageParam,
    threadId,
    client,
  })).map((message) => (
    serializeMessage({ message })
  ))
)
