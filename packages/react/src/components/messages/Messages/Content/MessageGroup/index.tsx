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
import { MessageGroup as MessageGroupType } from '@/types'
import { Content } from './Content'

type Args = {
  messageGroup: MessageGroupType
}

export const MessageGroup = ({
  messageGroup,
}: Args) => (
  <MessagesGroupBase>
    {messageGroup.role === 'user' ? (
      <Avatar
        fallback={<PersonIcon />}
        size="1"
      />
    ) : (
      <AssistantAvatar />
    )}

    <Box>
      <Name>
        {messageGroup.role === 'user' ? 'You' : 'Superdomain'}
      </Name>

      <Content
        messageGroup={messageGroup}
      />
    </Box>
  </MessagesGroupBase>
)
