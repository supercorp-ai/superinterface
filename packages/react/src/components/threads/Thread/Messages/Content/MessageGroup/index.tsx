import { useContext } from 'react'
import {
  Box,
  Avatar,
} from '@radix-ui/themes'
import {
  PersonIcon,
} from '@radix-ui/react-icons'
import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'
import { Name } from '@/components/messageGroups/MessageGroupBase/Name'
import { AssistantAvatar } from '@/components/messageGroups/MessageGroupBase/AssistantAvatar'
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
    <MessageGroupBase>
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
    </MessageGroupBase>
  )
}
