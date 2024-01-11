import { MessagesPage } from '@/types'
// import { queryFn } from './queryFn'
import { queryKey } from './queryKey'

export const queryOptions = {
  queryKey,
  // queryFn: ({
  //   pageParam,
  // }: { pageParam?: string }) => (
  //   queryFn({
  //     ...(pageParam ? { cursor: pageParam } : {}),
  //   })
  // ),
  initialPageParam: undefined,
  getNextPageParam: (lastPage: MessagesPage) => {
    if (!lastPage.hasNextPage) return null

    return lastPage.lastId
  },
}
