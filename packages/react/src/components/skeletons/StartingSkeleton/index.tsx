import { useContext } from 'react'
import { Box } from '@radix-ui/themes'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { ThreadMessagesGroupBase } from '@/components/threadMessageGroups/ThreadMessagesGroupBase'
import { Name } from '@/components/threadMessageGroups/ThreadMessagesGroupBase/Name'
import { AssistantAvatar } from '@/components/threadMessageGroups/ThreadMessagesGroupBase/AssistantAvatar'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'

type Args = {
  children?: React.ReactNode
}

export const StartingSkeleton = ({
  children,
}: Args) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <ThreadMessagesGroupBase>
      <AssistantAvatar />

      <Box>
        <Name>
          {assistantNameContext}
        </Name>

        {children}

        <StartingContentSkeleton />
      </Box>
    </ThreadMessagesGroupBase>
  )
}
