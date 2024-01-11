import { useMemo } from 'react'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { Message, MessagesPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { queryOptions as defaultQueryOptions } from '@/hooks/messages/useMessages/lib/queryOptions'
import { mergeOptions } from '@/lib/core/mergeOptions'

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

export const useMessages = (queryOptions: Args = {}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const merged = mergeOptions(
    defaultQueryOptions,
    superinterfaceContext.queryOptions.messages,
    queryOptions,
  )
  console.log({ superinterfaceContext, queryOptions, merged })
  const props = useInfiniteQuery(merged)
  console.log({ props })

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    messages: messages({ props }),
  }), [props])
}
