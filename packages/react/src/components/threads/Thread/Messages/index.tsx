'use client'

import {
  Flex,
} from '@radix-ui/themes'
import { useInfiniteScroll } from '@/hooks/misc/useInfiniteScroll'
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton'
import { useMessages } from '@/hooks/messages/useMessages'
import { useLifecycle } from '@/hooks/threads/useLifecycle'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { Content } from './Content'
import { Progress } from './Progress'

type Args = {
  children?: React.ReactNode
  style?: React.CSSProperties
}

export const Messages = ({
  children,
  style = {},
}: Args) => {
  const {
    messages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isLoading,
    isLoadingError,
  } = useMessages()

  useLifecycle()

  const { containerRef, loaderRef } = useInfiniteScroll({
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  })

  const { isRunActive } = useIsRunActive()
  const { latestMessage } = useLatestMessage()

  return (
    <Flex
      ref={containerRef}
      direction="column-reverse"
      grow="1"
      style={{
        ...style,
        overflow: 'auto',
      }}
    >
      <Flex
        shrink="0"
        style={{
          height: 'var(--space-3)',
        }}
      />

      <Progress
        latestMessage={latestMessage}
        isRunActive={isRunActive}
      />

      {children}

      <Content
        messages={messages}
        isLoading={isLoading}
        isLoadingError={isLoadingError}
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
