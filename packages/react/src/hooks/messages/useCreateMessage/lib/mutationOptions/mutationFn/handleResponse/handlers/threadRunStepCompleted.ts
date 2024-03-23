import { QueryClient } from '@tanstack/react-query'
import OpenAI from 'openai'
import { SerializedRunStep, SerializedMessage, MessagesQueryKey } from '@/types'
import { replace } from 'radash'

export const threadRunStepCompleted = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunStepCompleted
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
                  runSteps: replace(m.runSteps, value.data, (rs: SerializedRunStep) => rs.id === value.data.id),
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
