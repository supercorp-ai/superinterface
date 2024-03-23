import { QueryClient } from '@tanstack/react-query'
import OpenAI from 'openai'
import _ from 'lodash'
import { omit } from 'radash'
import { MessagesQueryKey } from '@/types'

const updatedContentPart = ({
  prevContentPart,
  delta,
}: {
  prevContentPart: OpenAI.Beta.Threads.Messages.MessageContent
  delta: OpenAI.Beta.Threads.Messages.MessageContentDelta
}) => {
  if (!prevContentPart) {
    return omit(delta, ['index'])
  }

  if (delta.type === 'text' && delta.text && prevContentPart.type == 'text' && prevContentPart.text) {
    return {
      ...prevContentPart,
      text: {
        ...prevContentPart.text,
        value: `${prevContentPart.text.value}${delta.text.value}`,
        annotations: [
          ...(prevContentPart.text.annotations ?? []),
          ...(delta.text.annotations ?? []),
        ]
      },
    }
  }

  return prevContentPart
}

const updatedContent = ({
  content,
  value,
}: {
  content: OpenAI.Beta.Threads.Messages.MessageContent
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageDelta
}) => {
  if (!value.data.delta.content) return content

  const result = _.cloneDeep(content)

  value.data.delta.content.forEach((delta: OpenAI.Beta.Threads.Messages.MessageContentDelta) => {
    // @ts-ignore-next-line
    result[delta.index] = updatedContentPart({
      // @ts-ignore-next-line
      prevContentPart: result[delta.index],
      delta,
    })
  })

  return result
}

export const threadMessageDelta = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageDelta
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
              data: [],
              hasNextPage: false,
              lastId: null,
            },
          ],
        }
      }

      const [latestPage, ...pagesRest] = prevData.pages
      const [latestMessage, ...messagesRest] = latestPage.data

      return {
        ...prevData,
        pages: [
          {
            ...latestPage,
            data: [
              {
                ...latestMessage,
                content: updatedContent({ content: latestMessage.content, value }),
              },
              ...messagesRest,
            ],
          },
          ...pagesRest,
        ],
      }
    }
  )
)
