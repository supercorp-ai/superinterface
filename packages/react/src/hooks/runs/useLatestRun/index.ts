import { useMemo } from 'react'
import { useRuns } from '@/hooks/runs/useRuns'

export const useLatestRun = () => {
  const props = useRuns()

  return useMemo(() => ({
    ...props,
    latestRun: props.runs[0],
  }), [props])
}
