import { useMemo } from 'react'
import { messageGroups as getMessageGroups } from './lib/messageGroups'
import { SerializedMessage } from '@/types'

type Args = {
  messages: SerializedMessage[]
}

export const useMessageGroups = ({
  messages,
}: Args) => (
  useMemo(
    () => ({
      messageGroups: getMessageGroups({ messages }),
    }),
    [messages]
  )
)
