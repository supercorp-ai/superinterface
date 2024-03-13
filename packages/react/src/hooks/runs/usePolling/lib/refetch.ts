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
  await queryClient.refetchQueries({
    queryKey: threadContext.defaultOptions.queries.queryKey ?? ['messages', threadContext.variables],
  })

  await queryClient.refetchQueries({
    queryKey: threadContext.defaultOptions.queries.queryKey ?? ['runs', threadContext.variables],
  })
}
