import { omit } from 'radash'
import { QueryClient } from '@tanstack/react-query'
import { Response } from './mutationFn'
// import { fillOption } from '@/lib/core/fillOption'

type Variables = any

type Context = {
  meta: any
}

export const onSettled = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  _data: Response,
  _error: any,
  variables: Variables,
  _context: Context,
) => {
  await queryClient.invalidateQueries({
    queryKey: ['threadMessages', omit(variables, ['content'])],
  })
    // fillOption({
    //   value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
    //   key: 'queryKey',
    //   meta: context.meta,
    //   args: variables,
    // }),
  // })
  await queryClient.invalidateQueries({
    queryKey: ['runs', omit(variables, ['content'])],
  })
}
