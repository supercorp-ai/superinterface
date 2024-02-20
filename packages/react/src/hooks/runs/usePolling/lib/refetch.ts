import {
  QueryClient,
} from '@tanstack/react-query'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

type Args = {
  queryClient: QueryClient
  threadContext: ReturnType<typeof useThreadContext>,
}

export const refetch = async ({
  queryClient,
  threadContext,
}: Args) => {
  await queryClient.invalidateQueries({
    queryKey: threadContext.defaultOptions.queries.queryKey ?? ['threadMessages', threadContext.variables],
  })

  await queryClient.invalidateQueries({
    queryKey: threadContext.defaultOptions.queries.queryKey ?? ['runs', threadContext.variables],
  })
}
