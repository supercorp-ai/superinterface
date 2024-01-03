import { useMemo } from 'react'
import {
  useInfiniteQuery,
  InfiniteData,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query'
import { Message, MessagesPage } from '@/types'
import { queryOptions as defaultQueryOptions } from './lib/queryOptions'

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
}

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


export const useMessages = ({
  messagesQueryOptions,
}: Args) => {
  const props = useInfiniteQuery({
    ...defaultQueryOptions,
    ...messagesQueryOptions,
  })

  return useMemo(() => ({
    ...props,
    messages: messages({ props }),
  }), [props])
}
