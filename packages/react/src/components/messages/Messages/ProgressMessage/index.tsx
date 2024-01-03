import { Box } from '@radix-ui/themes'
import { MessagesGroupBase } from '@/components/messageGroups/MessagesGroupBase'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { StartingSkeleton } from '@/components/skeletons/StartingSkeleton'
import { Message } from '@/types'

type Args = {
  latestMessage: Message | null
  isRunActive: boolean
}

export const ProgressMessage = ({
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
    <MessagesGroupBase>
      <Box pl="5" />
      <StartingContentSkeleton />
    </MessagesGroupBase>
  )
}
