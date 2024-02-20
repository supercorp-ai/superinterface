import { Box } from '@radix-ui/themes'
import { ThreadMessagesGroupBase } from '@/components/threadMessageGroups/ThreadMessagesGroupBase'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { StartingSkeleton } from '@/components/skeletons/StartingSkeleton'
import { ThreadMessage } from '@/types'

type Args = {
  latestThreadMessage: ThreadMessage | null
  isRunActive: boolean
}

export const Progress = ({
  latestThreadMessage,
  isRunActive,
}: Args) => {
  if (!latestThreadMessage) return null
  if (!isRunActive) return null

  if (latestThreadMessage.role === 'user') {
    return (
      <StartingSkeleton />
    )
  }

  return (
    <ThreadMessagesGroupBase>
      <Box pl="5" />
      <StartingContentSkeleton />
    </ThreadMessagesGroupBase>
  )
}
