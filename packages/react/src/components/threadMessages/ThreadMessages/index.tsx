'use client'

import {
  Flex,
} from '@radix-ui/themes'
import { useInfiniteScroll } from '@/hooks/misc/useInfiniteScroll'
import { ThreadMessagesSkeleton } from '@/components/skeletons/ThreadMessagesSkeleton'
import { useThreadMessages } from '@/hooks/threadMessages/useThreadMessages'
import { useThreadLifecycles } from '@/hooks/threads/useThreadLifecycles'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { Content } from './Content'
import { Progress } from './Progress'

type Args = {
  children?: React.ReactNode
}

export const ThreadMessages = ({
  children,
}: Args) => {
  const {
    threadMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isLoading,
    isLoadingError,
  } = useThreadMessages()

  useThreadLifecycles()

  const { containerRef, loaderRef } = useInfiniteScroll({
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  })

  const { isRunActive } = useIsRunActive()
  const { latestThreadMessage } = useLatestThreadMessage()

  return (
    <Flex
      ref={containerRef}
      direction="column-reverse"
      grow="1"
      style={{
        overflow: 'auto',
      }}
    >
      <Flex
        shrink="0"
        height="3"
      />

      <Progress
        latestThreadMessage={latestThreadMessage}
        isRunActive={isRunActive}
      />

      {children}

      <Content
        threadMessages={threadMessages}
        isLoading={isLoading}
        isLoadingError={isLoadingError}
      />

      {hasNextPage && (
        <ThreadMessagesSkeleton
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
