'use client'
import { useEffect } from 'react'
import { useMessages } from '@/hooks/messages/useMessages'
import { useMessageGroups } from '@/hooks/messageGroups/useMessageGroups'
import { MessageGroup as MessageGroupType } from '@/types'
import { useToasts } from '@/hooks/toasts/useToasts'
import { useComponents } from '@/hooks/components/useComponents'

export const Content = () => {
  const { messages, isLoading, isLoadingError } = useMessages()

  const { addToast } = useToasts()

  const { messageGroups } = useMessageGroups({
    messages,
  })

  const {
    components: { MessageGroup, MessagesSkeleton },
  } = useComponents()

  useEffect(() => {
    if (isLoadingError) {
      addToast({
        type: 'error',
        message: 'Could not load messages. Please try again.',
      })
    }
  }, [isLoadingError, addToast])

  if (isLoading || isLoadingError) {
    return <MessagesSkeleton />
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
