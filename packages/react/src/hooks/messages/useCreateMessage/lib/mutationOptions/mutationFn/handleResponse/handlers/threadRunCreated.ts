import OpenAI from 'openai'
import { optimisticId } from '@/lib/optimistic/optimisticId'

export const threadRunCreated = ({
  value,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunCreated
}) => (prevData: any) => {
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
            file_ids: [],
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
