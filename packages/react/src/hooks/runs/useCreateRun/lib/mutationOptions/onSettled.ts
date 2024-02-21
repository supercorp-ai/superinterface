import { QueryClient } from '@tanstack/react-query'
import { Response } from './mutationFn'

type Variables = {
  [key: string]: any
}

export const onSettled = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  _data: Response,
  _error: any,
  variables: Variables,
) => {
  await queryClient.invalidateQueries({
    queryKey: ['threadMessages', variables],
  })

  await queryClient.invalidateQueries({
    queryKey: ['runs', variables],
  })
  //
  // await queryClient.invalidateQueries({
  //   queryKey: fillOption({
  //     value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
  //     key: 'queryKey',
  //     meta: context.meta,
  //     args: variables,
  //   }),
  // })
  //
  // await context.meta.queryClient.invalidateQueries({
  //   queryKey: fillOption({
  //     value: context.meta.superinterfaceContext.queryOptions.runs.queryKey,
  //     key: 'queryKey',
  //     meta: context.meta,
  //     args: variables,
  //   }),
  // })
}
