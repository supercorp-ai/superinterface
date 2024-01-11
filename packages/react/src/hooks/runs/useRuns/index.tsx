import { useMemo } from 'react'
import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { getRuns } from './lib/getRuns'
import { RunsPage } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { extendOptions } from '@/lib/core/extendOptions'
import { useMeta } from '@/hooks/metas/useMeta'

type Args = UseInfiniteQueryOptions<InfiniteData<RunsPage>> | {}

export const useRuns = (args: Args = {}) => {
  const { meta } = useMeta()
  const superinterfaceContext = useSuperinterfaceContext()

  // @ts-ignore-next-line
  const props = useInfiniteQuery(extendOptions({
    defaultOptions: superinterfaceContext.queryOptions.runs,
    args,
    meta,
  }))

  return useMemo(() => ({
    ...props,
    // @ts-ignore-next-line
    runs: getRuns({ data: props.data }),
  }), [props])
}
