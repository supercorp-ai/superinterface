'use client'

import {
  Flex,
} from '@radix-ui/themes'
import { useInfiniteScroll } from '@/hooks/misc/useInfiniteScroll'
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton'
import { useMessages } from '@/hooks/messages/useMessages'
import { useThreadLifecycles } from '@/hooks/threads/useThreadLifecycles'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { Content } from './Content'
import { ProgressMessage } from './ProgressMessage'

type Args = {
  children?: React.ReactNode
  [key: string]: any
}

export const Messages = ({
  children,
  ...args
}: Args) => {
  const {
    messages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(args)

  useThreadLifecycles(args)

  const { containerRef, loaderRef } = useInfiniteScroll({
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  })

  const { isRunActive } = useIsRunActive(args)
  const { latestMessage } = useLatestMessage(args)

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
