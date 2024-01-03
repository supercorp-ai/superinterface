import { useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { useThrottledEffect } from '@/hooks/misc/useThrottledEffect'

type Args = {
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}

export const useInfiniteScroll = ({
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: Args) => {
  const containerRef = useRef(null)

  const { ref: loaderRef, inView } = useInView({
    root: containerRef.current,
    rootMargin: '0px',
    threshold: 0.1,
  })

  useThrottledEffect(
    () => {
      if (isFetchingNextPage) return
      if (!inView) return
      if (!hasNextPage) return

      console.log('Fetching next page')
      fetchNextPage()
    },
    500,
    [inView, isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  return {
    containerRef,
    loaderRef,
    inView,
  }
}
