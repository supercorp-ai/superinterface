import { useMemo } from 'react'
import {
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { runsQueryOptions } from '@/lib/runs/runsQueryOptions'
import { getRuns } from './lib/getRuns'

export const useRuns = () => {
  const queryClient = useQueryClient()
  const superinterfaceContext = useSuperinterfaceContext()
  const threadContext = useThreadContext()

  const props = useInfiniteQuery(runsQueryOptions({
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
