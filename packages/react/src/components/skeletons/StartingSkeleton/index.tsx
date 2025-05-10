'use client'
import { useContext } from 'react'
import { Box } from '@radix-ui/themes'
import { StartingContentSkeleton } from '@/components/skeletons/StartingContentSkeleton'
import { MessageGroup } from '@/components/messageGroups/MessageGroup'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'

type Args = {
  children?: React.ReactNode
}

export const StartingSkeleton = ({
  children,
}: Args) => (
  <Root>
    {children}

    <Content />
  </Root>
)

const Root = ({
  children,
}: Args) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <MessageGroup.Root>
      <MessageGroup.AssistantAvatar />

      <Box>
        <MessageGroup.Name>
          {assistantNameContext}
        </MessageGroup.Name>

        {children}

        <StartingContentSkeleton />
      </Box>
    </MessageGroup.Root>
  )
}

const Content = StartingContentSkeleton

StartingSkeleton.Root = Root
StartingSkeleton.Content = Content
