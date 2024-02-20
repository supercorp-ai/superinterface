import {
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { useThreadMessages } from '@/hooks/threadMessages/useThreadMessages'
import { ThreadMessagesPage } from '@/types'

type Args = UseInfiniteQueryOptions<InfiniteData<ThreadMessagesPage>> | {}

export const useLatestThreadMessage = (args: Args = {}) => {
  const props = useThreadMessages(args)

  return useMemo(() => ({
    ...props,
    latestThreadMessage: props.threadMessages[0] || null,
  }), [props])
}
