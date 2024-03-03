import {
  useQueryClient,
} from '@tanstack/react-query'
import { useInterval } from 'react-use'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { refetch } from './lib/refetch'

export const usePolling = () => {
  const threadContext = useThreadContext()
  const queryClient = useQueryClient()

  const isRunActiveProps = useIsRunActive()

  useInterval(() => {
    refetch({
      queryClient,
      threadContext,
    })
  },
    isRunActiveProps.isRunActive ? 3000 : null
  )

  return null
}
