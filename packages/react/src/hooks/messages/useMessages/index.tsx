import { useMemo } from 'react'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { SerializedMessage, MessagesPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { messagesQueryOptions } from '@/lib/messages/messagesQueryOptions'

const messages = ({
  props,
}: {
  props: {
    data: InfiniteData<MessagesPage> | undefined
  },
}) => {
  if (!props.data) return []

  return props.data.pages.reduce<SerializedMessage[]>((acc, page) => (
    acc.concat(page.data)
  ), [])
}


export const useMessages = () => {
  const queryClient = useQueryClient()
  const threadContext = useThreadContext()
  const superinterfaceContext = useSuperinterfaceContext()

  const props = useInfiniteQuery(messagesQueryOptions({
    queryClient,
    threadContext,
    superinterfaceContext,
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    messages: messages({ props }),
  }), [props])
}
