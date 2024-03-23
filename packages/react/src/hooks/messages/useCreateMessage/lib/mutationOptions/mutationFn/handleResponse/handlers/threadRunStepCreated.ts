import { QueryClient } from '@tanstack/react-query'
import OpenAI from 'openai'
import { SerializedMessage, MessagesQueryKey } from '@/types'

export const threadRunStepCreated = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunStepCreated
  messagesQueryKey: MessagesQueryKey
  queryClient: QueryClient
}) => (
  queryClient.setQueryData(
    messagesQueryKey,
    (prevData: any) => {
      if (!prevData) return prevData

      const [latestPage, ...pagesRest] = prevData.pages

      return {
        ...prevData,
        pages: [
          {
            ...latestPage,
            data: latestPage.data.map((m: SerializedMessage) => {
              if (m.run_id === value.data.run_id) {
                return {
                  ...m,
                  runSteps: [
                    value.data,
                    ...m.runSteps,
                  ],
                }
              }

              return m
            }),
          },
          ...pagesRest,
        ],
      }
    }
  )
)
