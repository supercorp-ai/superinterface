import { QueryClient } from '@tanstack/react-query'
import { SerializedMessage, ThreadMessageCreatedEvent } from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { extendMessage } from './extendMessage'
import { MessagesQueryKey } from '@/types'

const appendMessage = ({
  message,
  messages,
}: {
  message: SerializedMessage
  messages: SerializedMessage[]
}) => {
  const prevMessages = messages.filter((m: SerializedMessage) => (
    m.run_id != message.run_id || !isOptimistic({ id: m.id })
  ))

  return [
    extendMessage({ message, messages }),
    ...prevMessages,
  ]
}

export const threadMessageCreated = ({
  value,
  messagesQueryKey,
  queryClient,
}: {
  value: ThreadMessageCreatedEvent
  messagesQueryKey: MessagesQueryKey
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
              data: appendMessage({ message: value.data, messages: [] }),
              hasNextPage: false,
              lastId: value.data.id,
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
            data: appendMessage({ message: value.data, messages: latestPage.data }),
          },
          ...pagesRest,
        ],
      }
    }
  )
)
