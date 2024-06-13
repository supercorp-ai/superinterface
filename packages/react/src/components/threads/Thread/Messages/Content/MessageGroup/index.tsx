'use client'
import { useContext } from 'react'
import {
  Box,
} from '@radix-ui/themes'
import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'
import { Name } from '@/components/messageGroups/MessageGroupBase/Name'
import { AssistantAvatar } from '@/components/messageGroups/MessageGroupBase/AssistantAvatar'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { UserAvatar } from '@/components/messageGroups/MessageGroupBase/UserAvatar'
import { MessageGroup as MessageGroupType } from '@/types'
import { Content } from './Content'

type Args = {
  messageGroup: MessageGroupType
}

export const MessageGroup = ({
  messageGroup,
}: Args) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <MessageGroupBase>
      {messageGroup.role === 'user' ? (
        <UserAvatar />
      ) : (
        <AssistantAvatar />
      )}

      <Box flexGrow="1">
        <Name>
          {messageGroup.role === 'user' ? 'You' : assistantNameContext}
        </Name>

        <Content
          messageGroup={messageGroup}
        />
      </Box>
    </MessageGroupBase>
  )
}
