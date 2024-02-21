import {
  InfiniteData,
  UseInfiniteQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query'
import { merge } from '@/lib/misc/merge'
import { ThreadMessagesPage } from '@/types'
import { ThreadContext } from '@/contexts/threads/ThreadContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

type Args = {
  children: React.ReactNode
  variables: {
    [key: string]: any
  }
  defaultOptions?: {
    queries?: UseInfiniteQueryOptions<InfiniteData<ThreadMessagesPage>>
    mutations?: UseMutationOptions
  }
}

export const ThreadProvider = ({
  children,
  ...rest
}: Args) => {
  const threadContext = useThreadContext()

  const value = merge(
    threadContext,
    rest
  )

  return (
    <ThreadContext.Provider
      value={value}
    >
      {children}
    </ThreadContext.Provider>
  )
}
