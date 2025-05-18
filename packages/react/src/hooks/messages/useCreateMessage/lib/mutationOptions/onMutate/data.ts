import { isArray } from 'radash'
import dayjs from 'dayjs'
import OpenAI from 'openai'
import { optimisticId } from '@/lib/optimistic/optimisticId'

type NewMessage = {
  content: string
  attachments: OpenAI.Beta.Threads.Messages.Message['attachments'] | undefined
}

type Args = {
  newMessage: NewMessage
}

const content = ({
  newMessage,
}: {
  newMessage: NewMessage
}) => {
  if (isArray(newMessage.content)) {
    return newMessage.content.map((item) => {
      if (item.type === 'text') {
        return {
          type: 'text',
          text: {
            annotations: [],
            value: item.text,
          },
        } as OpenAI.Beta.Threads.Messages.TextContentBlock
      }

      return item
    })
  }

  return [
    {
      type: 'text',
      text: {
        annotations: [],
        value: newMessage.content,
      },
    } as OpenAI.Beta.Threads.Messages.TextContentBlock,
  ]
}

export const data = ({
  newMessage,
}: Args) => (prevData: any) => {
  const message = {
    id: optimisticId(),
    role: 'user' as OpenAI.Beta.Threads.Messages.Message['role'],
    created_at: dayjs().unix(),
    object: 'thread.message' as OpenAI.Beta.Threads.Messages.Message['object'],
    content: content({ newMessage }),
    run_id: null,
    assistant_id: null,
    thread_id: null,
    attachments: newMessage.attachments ?? [],
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
