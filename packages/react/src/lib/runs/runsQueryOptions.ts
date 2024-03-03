import { useQueryClient } from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { queryOptions } from '@/lib/threads/queryOptions'

export const runsQueryOptions = ({
  queryClient,
  threadContext,
  superinterfaceContext,
}: {
  queryClient: ReturnType<typeof useQueryClient>,
  threadContext: ReturnType<typeof useThreadContext>,
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>,
}) => (
  queryOptions({
    queryKeyBase: ['runs'],
    path: '/runs',
    queryClient,
    threadContext,
    superinterfaceContext,
  })
)
