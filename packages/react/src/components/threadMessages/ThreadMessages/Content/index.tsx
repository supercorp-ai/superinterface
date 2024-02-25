import { useThreadMessageGroups } from '@/hooks/threadMessageGroups/useThreadMessageGroups'
import { ThreadMessage } from '@/types'
import { ThreadMessagesSkeleton } from '@/components/skeletons/ThreadMessagesSkeleton'
import { ThreadMessageGroup } from './ThreadMessageGroup'

type Args = {
  threadMessages: ThreadMessage[]
  isLoading: boolean
  isLoadingError: boolean
}

export const Content = ({
  threadMessages,
  isLoading,
  isLoadingError,
}: Args) => {
  const { threadMessageGroups } = useThreadMessageGroups({
    threadMessages,
  })

  if (isLoading || isLoadingError) {
    return (
      <ThreadMessagesSkeleton />
    )
  }

  return (
    <>
      {threadMessageGroups.map((threadMessageGroup) => (
        <ThreadMessageGroup
          key={threadMessageGroup.id}
          threadMessageGroup={threadMessageGroup}
        />
      ))}
    </>
  )
}
