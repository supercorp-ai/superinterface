import { useQueryClient } from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { queryOptions } from '@/lib/threads/queryOptions'

export const messagesQueryOptions = ({
  queryClient,
  threadContext,
  superinterfaceContext,
}: {
  queryClient: ReturnType<typeof useQueryClient>,
  threadContext: ReturnType<typeof useThreadContext>,
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>,
}) => (
  queryOptions({
    queryKeyBase: ['messages'],
    path: '/messages',
    queryClient,
    threadContext,
    superinterfaceContext,
  })
)
