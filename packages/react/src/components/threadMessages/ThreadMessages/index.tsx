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
  [key: string]: any
}

export const ThreadMessages = ({
  children,
  ...args
}: Args) => {
  const {
    threadMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useThreadMessages(args)

  useThreadLifecycles(args)

  const { containerRef, loaderRef } = useInfiniteScroll({
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  })

  const { isRunActive } = useIsRunActive(args)
  const { latestThreadMessage } = useLatestThreadMessage(args)

  return (
    <Flex
      ref={containerRef}
      direction="column-reverse"
      grow="1"
      p="2"
      style={{
        overflow: 'auto',
      }}
    >
      <Flex
        shrink="0"
        height="1"
      />

      <Progress
        latestThreadMessage={latestThreadMessage}
        isRunActive={isRunActive}
      />

      {children}

      <Content
        threadMessages={threadMessages}
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
