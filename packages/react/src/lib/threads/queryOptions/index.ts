import {
  useQueryClient,
  infiniteQueryOptions,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { MessagesPage } from '@/types'
import { variableParams } from './variableParams'

type QueryFunctionArgs = {
  queryKey: Readonly<[string, { [key: string]: any }]>
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
}) => {
  const queryKey = [...queryKeyBase, threadContext.variables]

  return infiniteQueryOptions<MessagesPage>({
    // @ts-ignore-next-line
    queryFn: async ({
      pageParam,
      queryKey,
    }: QueryFunctionArgs) => {
      const [_key, variables] = queryKey
      const params = new URLSearchParams({
        ...(pageParam ? { pageParam } : {}),
        ...variableParams({ variables, superinterfaceContext }),
      })

      return fetch(`${superinterfaceContext.baseUrl}${path}?${params}`)
        .then(async (response) => {
          if (response.status !== 200) {
            try {
              const errorResponse = await response.json() as { error: string }
              throw new Error(errorResponse.error)
            } catch (error) {
              throw new Error('Failed to fetch')
            }
          }

          return response.json() as Promise<MessagesPage>
        })
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: MessagesPage) => {
      if (!lastPage.hasNextPage) return null

      return lastPage.lastId
    },
    limit: 10,
    ...threadContext.defaultOptions.queries,
    ...queryClient.getQueryDefaults(queryKey),
    queryKey,
  })
}
