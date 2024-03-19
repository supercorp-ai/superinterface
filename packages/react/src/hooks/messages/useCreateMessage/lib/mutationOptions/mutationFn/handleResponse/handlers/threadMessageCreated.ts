import OpenAI from 'openai'
import { Message } from '@superinterface/react/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { extendMessage } from './extendMessage'

const appendMessage = ({
  message,
  messages,
}: {
  message: Message
  messages: Message[]
}) => {
  const prevMessages = messages.filter((m: Message) => (
    m.run_id != message.run_id || !isOptimistic({ id: m.id })
  ))

  return [
    extendMessage({ message, messages }),
    ...prevMessages,
  ]
}

export const threadMessageCreated = ({
  value,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageCreated
}) => (prevData: any) => {
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
