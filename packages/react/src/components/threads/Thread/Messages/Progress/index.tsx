import { Box } from '@radix-ui/themes'
import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { StartingSkeleton } from '@/components/skeletons/StartingSkeleton'
import { Message } from '@/types'

type Args = {
  latestMessage: Message | null
  isRunActive: boolean
}

export const Progress = ({
  latestMessage,
  isRunActive,
}: Args) => {
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
