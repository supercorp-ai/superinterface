import { useMemo } from 'react'
import { StartingSkeleton } from '@/components/skeletons/StartingSkeleton'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'

export const Progress = () => {
  const { latestMessage } = useLatestMessage()
  const isMutatingMessage = useIsMutatingMessage()

  const isVisible = useMemo(() => {
    if (!latestMessage) return false
    if (latestMessage.role !== 'user') return false
    if (latestMessage.status === 'in_progress') return false
    if (!isOptimistic({ id: latestMessage.id })) return false
    if (!isMutatingMessage) return false

    return true
  }, [latestMessage, isMutatingMessage])

  if (!isVisible) return null

  return (
    <StartingSkeleton />
  )
}
