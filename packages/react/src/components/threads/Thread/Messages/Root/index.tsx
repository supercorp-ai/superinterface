'use client'

import { Flex } from '@radix-ui/themes'
import { useInfiniteScroll } from '@/hooks/misc/useInfiniteScroll'
import { useMessages } from '@/hooks/messages/useMessages'

export const Root = ({
  children,
  style = {},
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) => {
  const {
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages()

  const { containerRef, loaderRef } = useInfiniteScroll({
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  })

  return (
    <Flex
      ref={containerRef}
      direction="column-reverse"
      flexGrow="1"
      style={{
        ...style,
        overflow: 'auto',
      }}
    >
      {children}

      {hasNextPage && (
        <Flex
          ref={loaderRef}
        />
      )}

      <Flex
        flexShrink="0"
        flexGrow="1"
      />
    </Flex>
  )
}
