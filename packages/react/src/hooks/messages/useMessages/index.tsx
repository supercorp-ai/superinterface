import { useMemo } from 'react'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { Message, MessagesPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useMeta } from '@/hooks/metas/useMeta'
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
  const { meta } = useMeta()
  const superinterfaceContext = useSuperinterfaceContext()

  // @ts-ignore-next-line
  const props = useInfiniteQuery(extendOptions({
    defaultOptions: superinterfaceContext.queryOptions.messages,
    args,
    meta,
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    messages: messages({ props }),
  }), [props])
}
