import { useEffect } from 'react'
import { toast } from 'sonner'
import { useMessages } from '@/hooks/messages/useMessages'
import { useMessageGroups } from '@/hooks/messageGroups/useMessageGroups'
import { MessageGroup as MessageGroupType } from '@/types'
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton'
import { MessageGroup } from './MessageGroup'

export const Content = () => {
  const {
    messages,
    isLoading,
    isLoadingError,
  } = useMessages()

  const { messageGroups } = useMessageGroups({
    messages,
  })

  useEffect(() => {
    if (isLoadingError) {
      toast.error('Could not load messages. Please try again.')
    }
  }, [isLoadingError])

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
