import OpenAI from 'openai'
import { optimisticId } from '@/lib/optimistic/optimisticId'
import { Args as NewThreadMessageArgs } from '../mutationFn'

type Args = {
  newThreadMessage: NewThreadMessageArgs
}

export const data = ({
  newThreadMessage,
}: Args) => (prevData: any) => {
  const message = {
    id: optimisticId(),
    role: 'user' as OpenAI.Beta.Threads.Messages.ThreadMessage['role'],
    created_at: +new Date(),
    object: 'thread.message' as OpenAI.Beta.Threads.Messages.ThreadMessage['object'],
    content: [
      {
        type: 'text',
        text: {
          annotations: [],
          value: newThreadMessage.content,
        },
      } as OpenAI.Beta.Threads.Messages.MessageContentText,
    ],
    run_id: null,
    assistant_id: null,
    thread_id: null,
    file_ids: [],
    metadata: {},
    runSteps: [],
  }

  if (!prevData) {
    return {
      pageParams: [],
      pages: [
        {
          data: [message],
          hasNextPage: false,
          lastId: message.id,
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
          message,
          ...latestPage.data,
        ],
      },
      ...pagesRest,
    ],
  }
}