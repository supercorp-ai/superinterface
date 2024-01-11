import { useMemo } from 'react'
import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { getRuns } from './lib/getRuns'
import { RunsPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { mergeOptions } from '@/lib/core/mergeOptions'
import { queryOptions as defaultQueryOptions } from '@/hooks/runs/useRuns/lib/queryOptions'

type Args = UseInfiniteQueryOptions<InfiniteData<RunsPage>> | {}

export const useRuns = (queryOptions: Args = {}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  // @ts-ignore-next-line
  const props = useInfiniteQuery(mergeOptions(
    defaultQueryOptions,
    superinterfaceContext.queryOptions.runs,
    queryOptions,
  ))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    runs: getRuns({ data: props.data }),
  }), [props])
}
