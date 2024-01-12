import {
  useQueryClient,
} from '@tanstack/react-query'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { useInterval } from 'react-use'
import { useMeta } from '@/hooks/metas/useMeta'
import { refetch } from './lib/refetch'

type Args = {
  [key: string]: any
} | {}

export const usePolling = (args: Args = {}) => {
  const { meta } = useMeta()

  const isRunActiveProps = useIsRunActive(args)

  useInterval(() => {
    refetch({
      args,
      meta,
    })

    console.log('poll refetched')
  },
    isRunActiveProps.isRunActive ? 3000 : null
  )

  return null
}
