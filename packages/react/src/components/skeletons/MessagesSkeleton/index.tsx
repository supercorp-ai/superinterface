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
        className="animate-pulse"
      />

      <Box
        pb="3"
      >
        <Name>
          <Skeleton
            height="1"
            className="w-[128px]"
          />
        </Name>

        <Skeleton
          height="2"
          className="w-[256px]"
        />

        <Skeleton
          height="2"
          className="w-[256px] mt-2"
        />

        <Skeleton
          height="2"
          className="w-[256px] mt-2"
        />
      </Box>
    </MessagesGroupBase>
  )
})
