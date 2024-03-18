import { useMemo } from 'react'
// import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'
// import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { StartingSkeleton } from '@/components/skeletons/StartingSkeleton'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'

export const Progress = () => {
  const { isRunActive } = useIsRunActive()
  const { latestMessage } = useLatestMessage()

  const isVisible = useMemo(() => {
    if (!latestMessage) return false
    if (latestMessage.role !== 'user') return false
    if (latestMessage.status === 'in_progress') return false
    if (!isOptimistic({ id: latestMessage.id })) return false

    return true
  }, [latestMessage])

  if (!isVisible) return null
  if (!isRunActive) return null

  return (
    <StartingSkeleton />
  )
}
    // <MessageGroupBase>
    //   <Box pl="5" />
    //   <StartingContentSkeleton />
    // </MessageGroupBase>
