'use client'
import { useContext } from 'react'
import {
  Box,
} from '@radix-ui/themes'
import { Name } from './Name'
import { AssistantAvatar } from './AssistantAvatar'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { UserAvatar } from './UserAvatar'
import { MessageGroup as MessageGroupType, StyleProps} from '@/types'
import { Messages } from './Messages'
import { Root } from './Root'

type Args = {
  messageGroup: MessageGroupType
}

const Content = ({
  messageGroup,
}: Args) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <>
      {messageGroup.role === 'user' ? (
        <UserAvatar />
      ) : (
        <AssistantAvatar />
      )}

      <Box flexGrow="1">
        <Name>
          {messageGroup.role === 'user' ? 'You' : assistantNameContext}
        </Name>

        <Messages
          messageGroup={messageGroup}
        />
      </Box>
    </>
  )
}

export const MessageGroup = ({
  messageGroup,
  style,
  className,
}: Args & StyleProps) => (
  <Root
    className={className}
    style={style}
  >
    <Content
      messageGroup={messageGroup}
    />
  </Root>
)

MessageGroup.Root = Root
MessageGroup.Name = Name
MessageGroup.AssistantAvatar = AssistantAvatar
MessageGroup.UserAvatar = UserAvatar
MessageGroup.Messages = Messages
MessageGroup.Content = Content
