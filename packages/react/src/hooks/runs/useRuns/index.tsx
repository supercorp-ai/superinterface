import { useMemo } from 'react'
import {
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { queryOptions } from '@/lib/threads/queryOptions'
import { getRuns } from './lib/getRuns'

export const useRuns = () => {
  const queryClient = useQueryClient()
  const superinterfaceContext = useSuperinterfaceContext()
  const threadContext = useThreadContext()

  const props = useInfiniteQuery(queryOptions({
    queryKeyBase: ['runs'],
    path: '/runs',
    queryClient,
    threadContext,
    superinterfaceContext,
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    runs: getRuns({ data: props.data }),
  }), [props])
}
