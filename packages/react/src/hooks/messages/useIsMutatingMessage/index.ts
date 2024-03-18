import { useMemo } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

export const useIsMutatingMessage = () => {
  const threadContext = useThreadContext()

  const mutatingMessagesCount = useIsMutating({
    mutationKey: ['createMessage', threadContext.variables],
  })

  const isMutatingMessage = useMemo(() => (
    mutatingMessagesCount > 0
  ), [mutatingMessagesCount])

  return isMutatingMessage
}
