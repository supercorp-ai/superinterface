import { MessagesPage } from '@/types'
import { queryKey } from './queryKey'

export const queryOptions = {
  queryKey,
  initialPageParam: undefined,
  getNextPageParam: (lastPage: MessagesPage) => {
    if (!lastPage.hasNextPage) return null

    return lastPage.lastId
  },
}
