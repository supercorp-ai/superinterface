import { useThreadMessageGroups } from '@/hooks/threadMessageGroups/useThreadMessageGroups'
import { ThreadMessage } from '@/types'
import { ThreadMessageGroup } from './ThreadMessageGroup'

type Args = {
  threadMessages: ThreadMessage[]
}

export const Content = ({
  threadMessages,
}: Args) => {
  const { threadMessageGroups } = useThreadMessageGroups({
    threadMessages,
  })

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
