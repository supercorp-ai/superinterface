import { QueryClient } from '@tanstack/react-query'
import { Response } from '@/lib/runs/createRunMutationFn'

type Variables = {
  [key: string]: any
}

export const onSuccess = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  data: Response,
  variables: Variables,
) => (
  queryClient.setQueryData(
    ['runs', variables],
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
