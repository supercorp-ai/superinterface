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
      value: context.meta.superinterfaceContext.queryOptions.messages.queryKey,
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
              data: [data.message],
              hasNextPage: false,
              lastId: data.message.id,
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
              data.message,
              ...latestPage.data,
            ],
          },
          ...pagesRest,
        ],
      }
    }
  )
)
