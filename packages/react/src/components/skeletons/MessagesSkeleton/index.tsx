import { forwardRef } from 'react'
import {
  Flex,
  Avatar,
  Box,
  Skeleton,
} from '@radix-ui/themes'
import { MessageGroup } from '@/components/messageGroups/MessageGroup'

export const MessagesSkeleton = forwardRef(function MessagesSkeleton(_props, ref) {
  return (
    <MessageGroup.Root
      // @ts-ignore-next-line
      ref={ref}
    >
      <Skeleton loading>
        <Avatar
          fallback={<Flex />}
          size="1"
        />
      </Skeleton>

      <Box
        pb="3"
      >
        <MessageGroup.Name>
          <Skeleton
            loading
            style={{
              width: '128px',
            }}
          />
        </MessageGroup.Name>

        <Skeleton
          loading
          style={{
            width: '256px',
          }}
        />

        <Skeleton
          loading
          style={{
            width: '256px',
            marginTop: 'var(--space-2)',
          }}
        />

        <Skeleton
          loading
          style={{
            width: '256px',
            marginTop: 'var(--space-2)',
          }}
        />
      </Box>
    </MessageGroup.Root>
  )
})
