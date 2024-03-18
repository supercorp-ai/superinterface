import { useMemo } from 'react'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
// import { isOptimistic } from '@/lib/optimistic/isOptimistic'

export const useIsRunActive = () => {
  const { latestMessage } = useLatestMessage()

  const isRunActive = useMemo(() => {
    if (!latestMessage) return false
    if (latestMessage.status === 'in_progress') return true
    // if (isOptimistic({ id: latestMessage.id })) return true

    return false
  }, [latestMessage])

  return {
    isRunActive,
  }
}
