import { useMemo } from 'react'
import { useMessages } from '@/hooks/messages/useMessages'

export const useLatestMessage = () => {
  const props = useMessages()

  return useMemo(() => ({
    ...props,
    latestMessage: props.messages[0] || null,
  }), [props])
}
