import { useState } from 'react'
// import { assign } from 'radash'
import {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query'
import { merge } from '@/lib/misc/merge'
import { Message, Run, MessagesPage, RunsPage } from '@/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuperinterfaceContext } from '@/contexts/core/SuperinterfaceContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

type Args = {
  children: React.ReactNode
  queryOptions: {
    messages: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
    runs: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  },
  mutationOptions: {
    createMessage: UseMutationOptions<{ message: Message }>
    createRun: UseMutationOptions<{ run: Run }>
    handleAction: UseMutationOptions<{ run: Run }>
  },
}

export const SuperinterfaceProvider = ({
  children,
  ...rest
}: Args) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 10000,
          },
        },
      }),
  )

  const superinterfaceContext = useSuperinterfaceContext()

  const value = merge(
    superinterfaceContext,
    // @ts-ignore-next-line
    rest
  )

  console.log({ value, rest, superinterfaceContext })

  return (
    <SuperinterfaceContext.Provider
      value={value}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SuperinterfaceContext.Provider>
  )
}
