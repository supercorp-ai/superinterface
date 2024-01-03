import { queryKey as runsQueryKey } from '@/hooks/runs/useRuns/lib/queryOptions/queryKey'
import { Response } from './mutationFn'

type Args = {
  queryClient: any
}

export const onSuccess = ({
  queryClient,
}: Args) => (response: Response) => (
  queryClient.setQueryData(
    runsQueryKey(),
    (prevData: any) => {
      if (!prevData) {
        return {
          pageParams: [],
          pages: [
            {
              data: [response.run],
              hasNextPage: false,
              lastId: response.run.id,
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
              response.run,
              ...latestPage.data,
            ],
          },
          ...pagesRest,
        ],
      }
    }
  )
)
