import { forwardRef } from 'react'
import {
  Flex,
  Avatar,
  Box,
  Skeleton,
} from '@radix-ui/themes'
import { MessageGroupBase } from '@/components/messageGroups/MessageGroupBase'
import { Name } from '@/components/messageGroups/MessageGroupBase/Name'

export const MessagesSkeleton = forwardRef(function MessagesSkeleton(_props, ref) {
  return (
    <MessageGroupBase ref={ref}>
      <Skeleton loading>
        <Avatar
          fallback={<Flex />}
          size="1"
        />
      </Skeleton>

      <Box
        pb="3"
      >
        <Name>
          <Skeleton
            loading
            style={{
              width: '128px',
            }}
          />
        </Name>

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
    </MessageGroupBase>
  )
})
