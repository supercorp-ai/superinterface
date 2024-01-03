'use client'
import {
  UseInfiniteQueryOptions,
  UseMutationOptions,
  InfiniteData,
} from '@tanstack/react-query'
import {
  Flex,
} from '@radix-ui/themes'
import { useInfiniteScroll } from '@/hooks/misc/useInfiniteScroll'
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton'
import { useMessages } from '@/hooks/messages/useMessages'
import { useManageRuns } from '@/hooks/runs/useManageRuns'
import { usePolling } from '@/hooks/polling/usePolling'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { Content } from './Content'
import { ProgressMessage } from './ProgressMessage'
import { MessagesPage, RunsPage, Run } from '@/types'

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  createRunMutationOptions: UseMutationOptions<{ run: Run }>
  handleActionMutationOptions: UseMutationOptions<{ run: Run }>
  children?: React.ReactNode
}

export const Messages = ({
  messagesQueryOptions,
  runsQueryOptions,
  createRunMutationOptions,
  handleActionMutationOptions,
  children,
}: Args) => {
  const {
    messages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages({
    messagesQueryOptions,
  })

  useManageRuns({
    messagesQueryOptions,
    runsQueryOptions,
    createRunMutationOptions,
    handleActionMutationOptions,
  })

  usePolling({
    messagesQueryOptions,
    runsQueryOptions,
  })

  const { containerRef, loaderRef } = useInfiniteScroll({
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  })

  const { isRunActive } = useIsRunActive({
    messagesQueryOptions,
    runsQueryOptions,
  })

  const { latestMessage } = useLatestMessage({
    messagesQueryOptions,
  })

  return (
    <Flex
      ref={containerRef}
      direction="column-reverse"
      className="overflow-auto"
      grow="1"
      p="2"
    >
      <Flex
        shrink="0"
        height="1"
      />

      <ProgressMessage
        latestMessage={latestMessage}
        isRunActive={isRunActive}
      />

      {children}

      <Content
        messages={messages}
      />

      {hasNextPage && (
        <MessagesSkeleton
          ref={loaderRef}
        />
      )}

      <Flex
        shrink="0"
        grow="1"
      />
    </Flex>
  )
}
