import { Box } from '@radix-ui/themes'
import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { StartingSkeleton } from '@/components/skeletons/StartingSkeleton'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'

export const Progress = () => {
  const { isRunActive } = useIsRunActive()
  const { latestMessage } = useLatestMessage()

  if (!latestMessage) return null
  if (!isRunActive) return null

  if (latestMessage.role === 'user') {
    return (
      <StartingSkeleton />
    )
  }

  return (
    <MessageGroupBase>
      <Box pl="5" />
      <StartingContentSkeleton />
    </MessageGroupBase>
  )
}
