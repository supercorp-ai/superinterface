import { useContext } from 'react'
import { Box } from '@radix-ui/themes'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { MessagesGroupBase } from '@/components/messageGroups/MessagesGroupBase'
import { Name } from '@/components/messageGroups/MessagesGroupBase/Name'
import { AssistantAvatar } from '@/components/messageGroups/MessagesGroupBase/AssistantAvatar'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'

type Args = {
  children?: React.ReactNode
}

export const StartingSkeleton = ({
  children,
}: Args) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <MessagesGroupBase>
      <AssistantAvatar />

      <Box>
        <Name>
          {assistantNameContext}
        </Name>

        {children}

        <StartingContentSkeleton />
      </Box>
    </MessagesGroupBase>
  )
}
