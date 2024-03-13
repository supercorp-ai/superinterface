import { useEffect } from 'react'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useInterval, usePrevious } from 'react-use'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { usePollingContext } from '@/hooks/runs/usePollingContext'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { refetch } from './lib/refetch'

export const usePolling = () => {
  const threadContext = useThreadContext()
  const queryClient = useQueryClient()
  const { isPollRefetching, setIsPollRefetching } = usePollingContext()

  const isRunActiveProps = useIsRunActive()

  useInterval(async () => {
    if (isPollRefetching) return

    setIsPollRefetching(true)
    await refetch({
      queryClient,
      threadContext,
    })
    setIsPollRefetching(false)
    console.log('Polling...')
  },
    isRunActiveProps.isRunActive ? 3000 : null
  )

  const prevIsRunActive = usePrevious(isRunActiveProps.isRunActive)

  useEffect(() => {
    if (prevIsRunActive && !isRunActiveProps.isRunActive) {
      refetch({
        queryClient,
        threadContext,
      })
    }
  }, [queryClient, threadContext, isRunActiveProps, prevIsRunActive])

  return null
}
