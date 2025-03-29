import { useMemo } from 'react'
import { Flex, Box } from '@radix-ui/themes'
import { StartingSkeleton } from '@/components/skeletons/StartingSkeleton'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'

export const Progress = () => {
  const { latestMessage } = useLatestMessage()
  const isMutatingMessage = useIsMutatingMessage()

  const isStartingSkeletonVisible = useMemo(() => {
    if (!latestMessage) return false
    if (latestMessage.role !== 'user') return false
    if (latestMessage.status === 'in_progress') return false
    if (!isOptimistic({ id: latestMessage.id })) return false
    if (!isMutatingMessage) return false

    return true
  }, [latestMessage, isMutatingMessage])

  if (isStartingSkeletonVisible) {
    return (
      <StartingSkeleton />
    )
  }

  if (isMutatingMessage) {
    return (
      <MessageGroupBase>
        <Flex
          flexShrink="0"
          height="24px"
          width="24px"
        />

        <Box>
          <StartingContentSkeleton />
        </Box>
      </MessageGroupBase>
    )
  }

  return null
}
