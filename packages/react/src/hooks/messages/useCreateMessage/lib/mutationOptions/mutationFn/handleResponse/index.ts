import OpenAI from 'openai'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { MessagesQueryKey } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { handlers } from './handlers'

export const handleResponse = ({
  value,
  messagesQueryKey,
  queryClient,
  superinterfaceContext,
}: {
  value: {
    value: OpenAI.Beta.Assistants.AssistantStreamEvent
  }
  messagesQueryKey: MessagesQueryKey
  queryClient: ReturnType<typeof useQueryClient>
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  // @ts-ignore-next-line
  const handler = handlers[value.value.event]

  if (!handler) {
    return console.log('Missing handler', { value })
  }

  return handler({
    value: value.value,
    queryClient,
    messagesQueryKey,
    superinterfaceContext,
  })
}
