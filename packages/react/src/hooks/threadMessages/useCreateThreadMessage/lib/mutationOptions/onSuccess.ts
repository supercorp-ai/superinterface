import { Response } from './mutationFn'
import { fillOption } from '@/lib/core/fillOption'

type Variables = any

type Context = {
  meta: any
}

export const onSuccess = async (
  data: Response,
  variables: Variables,
  context: Context,
) => (
  context.meta.queryClient.setQueryData(
    fillOption({
      value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: variables,
    }),
    (prevData: any) => {
      if (!prevData) {
        return {
          pageParams: [],
          pages: [
            {
              data: [data.threadMessage],
              hasNextPage: false,
              lastId: data.threadMessage.id,
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
              data.threadMessage,
              ...latestPage.data,
            ],
          },
          ...pagesRest,
        ],
      }
    }
  )
)
