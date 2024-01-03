import { Box } from '@radix-ui/themes'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { MessagesGroupBase } from '@/components/messageGroups/MessagesGroupBase'
import { Name } from '@/components/messageGroups/MessagesGroupBase/Name'
import { AssistantAvatar } from '@/components/messageGroups/MessagesGroupBase/AssistantAvatar'

type Args = {
  children?: React.ReactNode
}

export const StartingSkeleton = ({
  children,
}: Args) => (
  <MessagesGroupBase>
    <AssistantAvatar />

    <Box>
      <Name>
        Superdomain
      </Name>

      {children}

      <StartingContentSkeleton />
    </Box>
  </MessagesGroupBase>
)
