'use client'
import { useMessages } from '@/hooks/messages/useMessages'
import { MessagesSkeleton } from '@/components/skeletons/MessagesSkeleton'

export const NextPageSkeleton = () => {
  const {
    hasNextPage,
  } = useMessages()

  if (!hasNextPage) {
    return null
  }

  return (
    <MessagesSkeleton />
  )
}
