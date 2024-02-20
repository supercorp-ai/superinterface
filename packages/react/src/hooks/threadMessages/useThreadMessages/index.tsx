import { useMemo } from 'react'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { ThreadMessage, ThreadMessagesPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useMeta } from '@/hooks/metas/useMeta'
import { extendOptions } from '@/lib/core/extendOptions'

type Args = UseInfiniteQueryOptions<InfiniteData<ThreadMessagesPage>> | {}

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

export const useThreadMessages = (args: Args = {}) => {
  const { meta } = useMeta()
  const superinterfaceContext = useSuperinterfaceContext()

  // @ts-ignore-next-line
  const props = useInfiniteQuery(extendOptions({
    defaultOptions: superinterfaceContext.queryOptions.threadMessages,
    args,
    meta,
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    threadMessages: threadMessages({ props }),
  }), [props])
}
