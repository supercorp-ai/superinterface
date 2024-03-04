import {
  useQueryClient,
} from '@tanstack/react-query'
import { useInterval } from 'react-use'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { usePollingContext } from '@/hooks/runs/usePollingContext'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { refetch } from './lib/refetch'

export const usePolling = () => {
  const threadContext = useThreadContext()
  const queryClient = useQueryClient()
  const { setIsPollRefetching } = usePollingContext()

  const isRunActiveProps = useIsRunActive()

  useInterval(async () => {
    setIsPollRefetching(true)
    await refetch({
      queryClient,
      threadContext,
    })
    setIsPollRefetching(false)
  },
    isRunActiveProps.isRunActive ? 3000 : null
  )

  return null
}
