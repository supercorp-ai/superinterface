import { ThreadMessagesPage } from '@/types'
import { queryKey } from './queryKey'

export const queryOptions = {
  queryKey,
  initialPageParam: undefined,
  getNextPageParam: (lastPage: ThreadMessagesPage) => {
    if (!lastPage.hasNextPage) return null

    return lastPage.lastId
  },
}
