import {
  useQueryClient,
} from '@tanstack/react-query'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { useInterval } from 'react-use'
import { refetch } from './lib/refetch'

type Args = {
  [key: string]: any
} | {}

export const usePolling = (args: Args = {}) => {
  const queryClient = useQueryClient()

  const isRunActiveProps = useIsRunActive(args)

  useInterval(() => {
    refetch({
      queryClient,
      latestRun: isRunActiveProps.latestRun,
    })

    console.log('poll refetched')
  },
    isRunActiveProps.isRunActive ? 3000 : null
  )

  return null
}
