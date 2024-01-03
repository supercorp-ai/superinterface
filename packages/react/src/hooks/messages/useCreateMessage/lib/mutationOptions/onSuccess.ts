import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { Response } from './mutationFn'

type Args = {
  queryClient: any
  passedOnSuccess?: () => void
}

export const onSuccess = ({
  queryClient,
  passedOnSuccess,
}: Args) => (response: Response) => {
  passedOnSuccess?.()

  queryClient.setQueryData(
    messagesQueryKey(),
    (prevData: any) => {
      if (!prevData) {
        return {
          pageParams: [],
          pages: [
            {
              data: [response.message],
              hasNextPage: false,
              lastId: response.message.id,
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
              response.message,
              ...latestPage.data,
            ],
          },
          ...pagesRest,
        ],
      }
    }
  )
}
