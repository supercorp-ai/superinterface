import dayjs from 'dayjs'
import OpenAI from 'openai'
import { optimisticId } from '@/lib/optimistic/optimisticId'

type Args = {
  newMessage: {
    content: string
  }
}

export const data = ({
  newMessage,
}: Args) => (prevData: any) => {
  const message = {
    id: optimisticId(),
    role: 'user' as OpenAI.Beta.Threads.Messages.Message['role'],
    created_at: dayjs().unix(),
    object: 'thread.message' as OpenAI.Beta.Threads.Messages.Message['object'],
    content: [
      {
        type: 'text',
        text: {
          annotations: [],
          value: newMessage.content,
        },
      } as OpenAI.Beta.Threads.Messages.TextContentBlock,
    ],
    run_id: null,
    assistant_id: null,
    thread_id: null,
    file_ids: [],
    metadata: {},
    runSteps: [],
  }
  console.log({ message, prevData })

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
  console.log({ latestPage, pagesRest, prevData })

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
