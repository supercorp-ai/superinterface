import { QueryClient } from '@tanstack/react-query'
import OpenAI from 'openai'
import { optimisticId } from '@/lib/optimistic/optimisticId'
import { MessagesQueryKey } from '@/types'

export const threadRunCreated = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunCreated
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
            data: [
              {
                id: optimisticId(),
                assistant_id: value.data.assistant_id,
                content: [],
                created_at: value.data.created_at,
                attachments: [],
                metadata: {},
                status: 'in_progress',
                role: 'assistant',
                runSteps: [],
                run_id: value.data.id,
                thread_id: value.data.thread_id,
              },
              ...latestPage.data,
            ]
          },
          ...pagesRest,
        ],
      }
    }
  )
)
