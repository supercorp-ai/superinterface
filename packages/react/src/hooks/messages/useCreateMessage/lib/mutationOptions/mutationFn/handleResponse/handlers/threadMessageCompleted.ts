import { replace } from 'radash'
import { ThreadMessageCompletedEvent } from '@/types'
import { extendMessage } from './extendMessage'
import {
  QueryClient,
} from '@tanstack/react-query'
import { MessagesQueryKey } from '@/types'

export const threadMessageCompleted = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  messagesQueryKey: MessagesQueryKey
  value: ThreadMessageCompletedEvent
  queryClient: QueryClient
}) => (
  queryClient.setQueryData(
    messagesQueryKey,
    (prevData: any) => {
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
            data: replace(latestPage.data, extendMessage({ message: value.data, messages: latestPage.data }), (m) => m.id === value.data.id),
          },
          ...pagesRest,
        ],
      }
    }
  )
)
