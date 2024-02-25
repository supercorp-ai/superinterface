import { forwardRef } from 'react'
import {
  Flex,
  Avatar,
  Box,
} from '@radix-ui/themes'
import { Skeleton } from '@/components/skeletons/Skeleton'
import { ThreadMessagesGroupBase } from '@/components/threadMessageGroups/ThreadMessagesGroupBase'
import { Name } from '@/components/threadMessageGroups/ThreadMessagesGroupBase/Name'

export const ThreadMessagesSkeleton = forwardRef(function ThreadMessagesSkeleton(_props, ref) {
  return (
    <ThreadMessagesGroupBase
      // @ts-ignore-next-line
      ref={ref}
    >
      <Avatar
        fallback={<Flex />}
        size="1"
        style={{
          animation: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite',
        }}
      />

      <Box
        pb="3"
      >
        <Name>
          <Skeleton
            height="1"
            style={{
              width: '128px',
            }}
          />
        </Name>

        <Skeleton
          height="2"
          style={{
            width: '256px',
          }}
        />

        <Skeleton
          height="2"
          style={{
            width: '256px',
            marginTop: 'var(--space-2)',
          }}
        />

        <Skeleton
          height="2"
          style={{
            width: '256px',
            marginTop: 'var(--space-2)',
          }}
        />
      </Box>
    </ThreadMessagesGroupBase>
  )
})
