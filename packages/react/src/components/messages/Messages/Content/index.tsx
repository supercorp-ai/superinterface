import { useMessageGroups } from '@/hooks/messageGroups/useMessageGroups'
import { Message } from '@/types'
import { MessageGroup } from './MessageGroup'

type Args = {
  messages: Message[]
}

export const Content = ({
  messages,
}: Args) => {
  const { messageGroups } = useMessageGroups({
    messages,
  })

  return (
    <>
      {messageGroups.map((messageGroup) => (
        <MessageGroup
          key={messageGroup.id}
          messageGroup={messageGroup}
        />
      ))}
    </>
  )
}
