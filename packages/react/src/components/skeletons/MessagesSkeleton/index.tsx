import { forwardRef } from 'react'
import {
  Flex,
  Avatar,
  Box,
} from '@radix-ui/themes'
import { Skeleton } from '@/components/skeletons/Skeleton'
import { MessagesGroupBase } from '@/components/messageGroups/MessagesGroupBase'
import { Name } from '@/components/messageGroups/MessagesGroupBase/Name'

export const MessagesSkeleton = forwardRef(function MessagesSkeleton(_props, ref) {
  return (
    <MessagesGroupBase
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
    </MessagesGroupBase>
  )
})
