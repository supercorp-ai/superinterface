import { useMemo } from 'react'
import { Box } from '@radix-ui/themes'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { useIsMutatingMessage } from '@/hooks/messages/useIsMutatingMessage'
import { MessageGroup } from '@/components/messageGroups/MessageGroup'
import { useComponents } from '@/hooks/components/useComponents'

const StartingSkeleton = () => {
  const {
    components: {
      StartingSkeleton,
    },
  } = useComponents()

  return (
    <StartingSkeleton />
  )
}

const StartingContentSkeleton = () => {
  const {
    components: {
      StartingContentSkeleton,
    },
  } = useComponents()

  return (
    <StartingContentSkeleton />
  )
}

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
      <MessageGroup.Root>
        <MessageGroup.AssistantAvatar.Root />

        <Box>
          <StartingContentSkeleton />
        </Box>
      </MessageGroup.Root>
    )
  }

  return null
}
