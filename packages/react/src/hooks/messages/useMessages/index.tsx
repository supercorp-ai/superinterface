import { useMemo } from 'react'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Message, MessagesPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
// import { queryOptions as defaultQueryOptions } from '@/hooks/messages/useMessages/lib/queryOptions'
// import { mergeOptions } from '@/lib/core/mergeOptions'
import { extendOptions } from '@/lib/core/extendOptions'

type Args = UseInfiniteQueryOptions<InfiniteData<MessagesPage>> | {}

const messages = ({
  props,
}: {
  props: {
    data: InfiniteData<MessagesPage> | undefined
  },
}) => {
  if (!props.data) return []

  return props.data.pages.reduce<Message[]>((acc, page) => (
    acc.concat(page.data)
  ), [])
}

export const useMessages = (args: Args = {}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const queryClient = useQueryClient()

  // @ts-ignore-next-line
  const props = useInfiniteQuery(extendOptions({
    defaultOptions: superinterfaceContext.queryOptions.messages,
    args,
    meta: {
      superinterfaceContext,
      queryClient,
    },
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    messages: messages({ props }),
  }), [props])
}
