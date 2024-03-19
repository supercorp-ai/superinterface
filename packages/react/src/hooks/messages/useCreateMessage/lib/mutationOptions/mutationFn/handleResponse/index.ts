import OpenAI from 'openai'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { handlers } from './handlers'

export const handleResponse = ({
  value,
  messagesQueryKey,
  queryClient,
}: {
  value: {
    value: OpenAI.Beta.Assistants.AssistantStreamEvent
  }
  messagesQueryKey: (string | Record<string, any>)[]
  queryClient: ReturnType<typeof useQueryClient>
}) => {
  // @ts-ignore-next-line
  const handler = handlers[value.value.event]

  if (!handler) {
    return console.log('Missing handler', { value })
  }

  return queryClient.setQueryData(
    messagesQueryKey,
    handler({ value: value.value })
  )
}
