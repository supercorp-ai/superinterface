import { useMemo } from 'react'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ThreadMessage, ThreadMessagesPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { queryOptions } from '@/lib/threads/queryOptions'

const threadMessages = ({
  props,
}: {
  props: {
    data: InfiniteData<ThreadMessagesPage> | undefined
  },
}) => {
  if (!props.data) return []

  return props.data.pages.reduce<ThreadMessage[]>((acc, page) => (
    acc.concat(page.data)
  ), [])
}


export const useThreadMessages = () => {
  const queryClient = useQueryClient()
  const threadContext = useThreadContext()
  const superinterfaceContext = useSuperinterfaceContext()

  const props = useInfiniteQuery(queryOptions({
    queryKeyBase: ['threadMessages'],
    path: '/thread-messages',
    queryClient,
    threadContext,
    superinterfaceContext,
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    threadMessages: threadMessages({ props }),
  }), [props])
}
