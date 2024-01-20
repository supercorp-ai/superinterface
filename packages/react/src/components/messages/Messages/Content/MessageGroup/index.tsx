import { useContext } from 'react'
import {
  Box,
  Avatar,
} from '@radix-ui/themes'
import {
  PersonIcon,
} from '@radix-ui/react-icons'
import { MessagesGroupBase } from '@/components/messageGroups/MessagesGroupBase'
import { Name } from '@/components/messageGroups/MessagesGroupBase/Name'
import { AssistantAvatar } from '@/components/messageGroups/MessagesGroupBase/AssistantAvatar'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
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
    <MessagesGroupBase>
      {messageGroup.role === 'user' ? (
        <Avatar
          fallback={<PersonIcon />}
          size="1"
        />
      ) : (
        <AssistantAvatar />
      )}

      <Box grow="1">
        <Name>
          {messageGroup.role === 'user' ? 'You' : assistantNameContext}
        </Name>

        <Content
          messageGroup={messageGroup}
        />
      </Box>
    </MessagesGroupBase>
  )
}
