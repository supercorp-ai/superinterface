import { useMemo } from 'react'
import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { queryOptions as defaultQueryOptions } from './lib/queryOptions'
import { getRuns } from './lib/getRuns'
import { RunsPage } from '@/types'

type Args = {
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
}

export const useRuns = ({
  runsQueryOptions,
}: Args) => {
  const props = useInfiniteQuery({
    ...defaultQueryOptions,
    ...runsQueryOptions,
  })

  return useMemo(() => ({
    ...props,
    runs: getRuns({ data: props.data }),
  }), [props])
}
