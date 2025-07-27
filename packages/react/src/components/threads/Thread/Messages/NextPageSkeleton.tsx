'use client'
import { useMessages } from '@/hooks/messages/useMessages'
import { useComponents } from '@/hooks/components/useComponents'

export const NextPageSkeleton = () => {
  const { hasNextPage } = useMessages()

  const {
    components: { MessagesSkeleton },
  } = useComponents()

  if (!hasNextPage) {
    return null
  }

  return <MessagesSkeleton />
}
