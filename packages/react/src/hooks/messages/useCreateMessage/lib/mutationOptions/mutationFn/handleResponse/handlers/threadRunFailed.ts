import { QueryClient } from '@tanstack/react-query'
import OpenAI from 'openai'
import { MessagesQueryKey } from '@/types'

export const threadRunFailed = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunCreated
  messagesQueryKey: MessagesQueryKey
  queryClient: QueryClient
}) => {
  throw new Error('There was a problem sending your message. Please try again.')
}
