import { Response } from './mutationFn'
import { fillOption } from '@/lib/core/fillOption'

type Variables = {
  assistantConversationId: string
}

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
      value: context.meta.superinterfaceContext.queryOptions.runs.queryKey,
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
              data: [data.run],
              hasNextPage: false,
              lastId: data.run.id,
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
              data.run,
              ...latestPage.data,
            ],
          },
          ...pagesRest,
        ],
      }
    }
  )
)
