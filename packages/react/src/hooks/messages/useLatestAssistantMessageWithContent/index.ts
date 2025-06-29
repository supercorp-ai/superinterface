import { isEmpty } from 'radash'
import { useMemo } from 'react'
import { useMessages } from '@/hooks/messages/useMessages'
import { SerializedMessage } from '@/types'

export const useLatestAssistantMessageWithContent = () => {
  const { messages } = useMessages()

  return useMemo(
    () => ({
      latestAssistantMessageWithContent:
        messages.find(
          (message: SerializedMessage) =>
            message.role === 'assistant' &&
            message.content.some(
              (content) =>
                content.type === 'text' && !isEmpty(content.text.value),
            ),
        ) ?? null,
    }),
    [messages],
  )
}
