import { QueryClient } from '@tanstack/react-query'
import { Response } from './mutationFn'
// import { fillOption } from '@/lib/core/fillOption'

type Variables = {
  [key: string]: any
}

// type Context = {
//   meta: any
// }

export const onSuccess = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  data: Response,
  variables: Variables,
  // context: Context,
) => (
  queryClient.setQueryData(
    ['runs', variables],
    // fillOption({
    //   value: context.meta.superinterfaceContext.queryOptions.runs.queryKey,
    //   key: 'queryKey',
    //   meta: context.meta,
    //   args: variables,
    // }),
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
