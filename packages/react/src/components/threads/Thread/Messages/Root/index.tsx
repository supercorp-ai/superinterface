'use client'

import { Flex } from '@radix-ui/themes'
import { useInfiniteScroll } from '@/hooks/misc/useInfiniteScroll'
import { useMessages } from '@/hooks/messages/useMessages'
import type { StyleProps } from '@/types'

export const Root = ({
  children,
  style,
  className,
}: {
  children: React.ReactNode
} & StyleProps) => {
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
        overflow: 'auto',
        ...(style ?? {}),
      }}
      className={className}
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
