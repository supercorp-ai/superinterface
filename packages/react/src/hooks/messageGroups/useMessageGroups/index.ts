import { useMemo } from 'react'
import { messageGroups as getMessageGroups } from './lib/messageGroups'
import { Message } from '@/types'

type Args = {
  messages: Message[]
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
