import { useContext } from 'react'
import {
  Box,
  Avatar,
} from '@radix-ui/themes'
import {
  PersonIcon,
} from '@radix-ui/react-icons'
import { ThreadMessagesGroupBase } from '@/components/threadMessageGroups/ThreadMessagesGroupBase'
import { Name } from '@/components/threadMessageGroups/ThreadMessagesGroupBase/Name'
import { AssistantAvatar } from '@/components/threadMessageGroups/ThreadMessagesGroupBase/AssistantAvatar'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { ThreadMessageGroup as ThreadMessageGroupType } from '@/types'
import { Content } from './Content'

type Args = {
  threadMessageGroup: ThreadMessageGroupType
}

export const ThreadMessageGroup = ({
  threadMessageGroup,
}: Args) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <ThreadMessagesGroupBase>
      {threadMessageGroup.role === 'user' ? (
        <Avatar
          fallback={<PersonIcon />}
          size="1"
        />
      ) : (
        <AssistantAvatar />
      )}

      <Box grow="1">
        <Name>
          {threadMessageGroup.role === 'user' ? 'You' : assistantNameContext}
        </Name>

        <Content
          threadMessageGroup={threadMessageGroup}
        />
      </Box>
    </ThreadMessagesGroupBase>
  )
}
