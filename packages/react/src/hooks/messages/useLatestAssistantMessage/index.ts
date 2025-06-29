import { useMemo } from 'react'
import { useMessages } from '@/hooks/messages/useMessages'
import { SerializedMessage } from '@/types'

export const useLatestAssistantMessage = () => {
  const { messages } = useMessages()

  return useMemo(
    () => ({
      latestAssistantMessage:
        messages.find(
          (message: SerializedMessage) => message.role === 'assistant',
        ) ?? null,
    }),
    [messages],
  )
}
