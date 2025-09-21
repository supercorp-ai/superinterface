import { QueryClient } from '@tanstack/react-query'
import type { ThreadMessageInProgressEvent } from '@/types'
import _ from 'lodash'
import { MessagesQueryKey } from '@/types'
import { extendMessage } from './extendMessage'

export const threadMessageInProgress = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  value: ThreadMessageInProgressEvent
  messagesQueryKey: MessagesQueryKey
  queryClient: QueryClient
}) =>
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
    const [_latestMessage, ...messagesRest] = latestPage.data

    return {
      ...prevData,
      pages: [
        {
          ...latestPage,
          data: [
            extendMessage({
              message: value.data,
              messages: latestPage.data,
            }),
            ...messagesRest,
          ],
        },
        ...pagesRest,
      ],
    }
  })
