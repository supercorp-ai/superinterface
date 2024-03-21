import { replace } from 'radash'
import { ThreadMessageCompletedEvent } from '@/types'
import { extendMessage } from './extendMessage'

export const threadMessageCompleted = ({
  value,
}: {
  value: ThreadMessageCompletedEvent
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
