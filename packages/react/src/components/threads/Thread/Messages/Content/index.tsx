import { useMessageGroups } from '@/hooks/messageGroups/useMessageGroups'
import { Message, MessageGroup as MessageGroupType } from '@/types'
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton'
import { MessageGroup } from './MessageGroup'

type Args = {
  messages: Message[]
  isLoading: boolean
  isLoadingError: boolean
}

export const Content = ({
  messages,
  isLoading,
  isLoadingError,
}: Args) => {
  const { messageGroups } = useMessageGroups({
    messages,
  })

  if (isLoading || isLoadingError) {
    return (
      <MessagesSkeleton />
    )
  }

  return (
    <>
      {messageGroups.map((messageGroup: MessageGroupType) => (
        <MessageGroup
          key={messageGroup.id}
          messageGroup={messageGroup}
        />
      ))}
    </>
  )
}
