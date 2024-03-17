import dayjs from 'dayjs'
import OpenAI from 'openai'
import { optimisticId } from '@/lib/optimistic/optimisticId'

export const data = (prevData: any) => {
  const run = {
    id: optimisticId(),
    object: 'thread.run' as OpenAI.Beta.Threads.Runs.Run['object'],
    created_at: dayjs().unix(),
    assistant_id: null,
    thread_id: null,
    status: 'in_progress' as OpenAI.Beta.Threads.Runs.Run['status'],
    expires_at: dayjs().unix() + 1000 * 60 * 60 * 24,
    cancelled_at: null,
    failed_at: null,
    completed_at: null,
    required_action: null,
    last_error: null,
    model: null,
    instructions: null,
    tools: [],
    file_ids: [],
    metadata: {},
    usage: null,
  }

  if (!prevData) {
    return {
      pageParams: [],
      pages: [
        {
          data: [run],
          hasNextPage: false,
          lastId: run.id,
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
        data: [
          run,
          ...latestPage.data,
        ],
      },
      ...pagesRest,
    ],
  }
}
