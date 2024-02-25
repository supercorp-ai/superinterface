import { useMemo } from 'react'
import { threadMessageGroups as getThreadMessageGroups } from './lib/threadMessageGroups'
import { ThreadMessage } from '@/types'

type Args = {
  threadMessages: ThreadMessage[]
}

export const useThreadMessageGroups = ({
  threadMessages,
}: Args) => (
  useMemo(
    () => ({
      threadMessageGroups: getThreadMessageGroups({ threadMessages }),
    }),
    [threadMessages]
  )
)
