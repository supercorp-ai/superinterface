import {
  useQueryClient,
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { useInterval } from 'react-use'
import { refetch } from './lib/refetch'
import { MessagesPage, RunsPage } from '@/types'

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
}

export const usePolling = ({
  messagesQueryOptions,
  runsQueryOptions,
}: Args) => {
  const queryClient = useQueryClient()

  const isRunActiveProps = useIsRunActive({
    messagesQueryOptions,
    runsQueryOptions,
  })

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
