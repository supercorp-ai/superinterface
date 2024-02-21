import {
  useQueryClient,
  infiniteQueryOptions,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { ThreadMessagesPage } from '@/types'

type QueryFnArgs = {
  queryKey: [string, {
    [key: string]: any
  }]
  pageParam?: string
}

export const queryOptions = ({
  queryKeyBase,
  path,
  queryClient,
  threadContext,
  superinterfaceContext,
}: {
  queryKeyBase: string[]
  path: string,
  queryClient: ReturnType<typeof useQueryClient>,
  threadContext: ReturnType<typeof useThreadContext>,
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>,
}) => infiniteQueryOptions<ThreadMessagesPage>({
  // @ts-ignore-next-line
  queryFn: async ({
    pageParam,
    queryKey: queryFnQueryKey,
  }: QueryFnArgs) => {
    const [_key, variables] = queryFnQueryKey
    const params = new URLSearchParams({
      pageParam: pageParam || '',
      ...variables,
    })

    return fetch(`${superinterfaceContext.baseUrl}${path}?${params}`).then(res => res.json())
  },
  initialPageParam: undefined,
  getNextPageParam: (lastPage: ThreadMessagesPage) => {
    if (!lastPage.hasNextPage) return null

    return lastPage.lastId
  },
  limit: 10,
  ...queryClient.getQueryDefaults(queryKeyBase),
  queryKey: [...queryKeyBase, threadContext.variables],
  ...threadContext.defaultOptions.queries,
})
