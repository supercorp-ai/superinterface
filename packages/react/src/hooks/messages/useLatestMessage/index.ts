import {
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { useMessages } from '@/hooks/messages/useMessages'
import { MessagesPage } from '@/types'

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
}

export const useLatestMessage = (args: Args) => {
  const props = useMessages(args)

  return useMemo(() => ({
    ...props,
    latestMessage: props.messages[0] || null,
  }), [props])
}
