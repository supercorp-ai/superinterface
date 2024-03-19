import OpenAI from 'openai'
import { replace } from 'radash'
import { extendMessage } from './extendMessage'

export const threadMessageCompleted = ({
  value,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadMessageCompleted
}) => (prevData: any) => {
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

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: replace(latestPage.data, extendMessage({ message: value.data, messages: latestPage.data }), (m) => m.id === value.data.id),
      },
      ...pagesRest,
    ],
  }
}
