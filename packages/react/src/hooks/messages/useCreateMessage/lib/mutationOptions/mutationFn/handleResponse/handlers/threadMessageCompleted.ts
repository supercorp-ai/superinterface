import { replace } from 'radash'
import type { MessagesQueryKey, ThreadMessageCompletedEvent } from '@/types'
import { extendMessage } from './extendMessage'
import type { QueryClient } from '@tanstack/react-query'

export const threadMessageCompleted = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  messagesQueryKey: MessagesQueryKey
  value: ThreadMessageCompletedEvent
  queryClient: QueryClient
}) => {
  queryClient.setQueryData(messagesQueryKey, (prevData: any) => {
    if (!prevData) {
      return {
        pageParams: [],
        pages: [
          {
            data: [],
            hasNextPage: false,
            lastId: null,
          },
        ],
      }
    }

    const [latestPage, ...pagesRest] = prevData.pages

    return {
      ...prevData,
      pages: [
        {
          ...latestPage,
          data: replace(
            latestPage.data,
            extendMessage({
              message: value.data,
              messages: latestPage.data,
            }),
            (message) => message.id === value.data.id,
          ),
        },
        ...pagesRest,
      ],
    }
  })

  // Stream events can omit response annotations that are available when the
  // completed message is read back. Mark this exact messages query stale so
  // an active conversation refetches the authoritative serialized message.
  void queryClient.invalidateQueries({ queryKey: messagesQueryKey })
}
