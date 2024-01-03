import _ from 'lodash'
import { RunsPage } from '@/types'
import { queryKey } from './queryKey'

export const queryOptions = {
  queryKey: queryKey(),
  // queryFn: ({
  //   pageParam,
  // }: { pageParam?: string }) => (
  //   queryFn({
  //     assistantConversationId,
  //   })
  // ),
  initialPageParam: undefined,
  getNextPageParam: (lastPage: RunsPage) => {
    if (!lastPage.hasNextPage) return null

    return lastPage.lastId
  },
  limit: 10,
}
