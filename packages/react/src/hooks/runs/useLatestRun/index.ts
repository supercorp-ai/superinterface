import {
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { useRuns } from '@/hooks/runs/useRuns'
import { RunsPage } from '@/types'

type Args = UseInfiniteQueryOptions<InfiniteData<RunsPage>> | {}

export const useLatestRun = (args: Args = {}) => {
  const props = useRuns(args)

  return useMemo(() => ({
    ...props,
    latestRun: props.runs[0],
  }), [props])
}
