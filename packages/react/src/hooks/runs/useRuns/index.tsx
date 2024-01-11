import { useMemo } from 'react'
import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  InfiniteData,
  useQueryClient,
} from '@tanstack/react-query'
import { getRuns } from './lib/getRuns'
import { RunsPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { extendOptions } from '@/lib/core/extendOptions'

type Args = UseInfiniteQueryOptions<InfiniteData<RunsPage>> | {}

export const useRuns = (args: Args = {}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const queryClient = useQueryClient()

  // @ts-ignore-next-line
  const props = useInfiniteQuery(extendOptions({
    defaultOptions: superinterfaceContext.queryOptions.runs,
    args,
    meta: {
      superinterfaceContext,
      queryClient,
    },
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    runs: getRuns({ data: props.data }),
  }), [props])
}
