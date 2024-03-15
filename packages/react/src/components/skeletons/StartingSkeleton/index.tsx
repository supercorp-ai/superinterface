'use client'
import { useContext } from 'react'
import { Box } from '@radix-ui/themes'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'
import { Name } from '@/components/messageGroups/MessageGroupBase/Name'
import { AssistantAvatar } from '@/components/messageGroups/MessageGroupBase/AssistantAvatar'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'

type Args = {
  children?: React.ReactNode
}

export const StartingSkeleton = ({
  children,
}: Args) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <MessageGroupBase>
      <AssistantAvatar />

      <Box>
        <Name>
          {assistantNameContext}
        </Name>

        {children}

        <StartingContentSkeleton />
      </Box>
    </MessageGroupBase>
  )
}
