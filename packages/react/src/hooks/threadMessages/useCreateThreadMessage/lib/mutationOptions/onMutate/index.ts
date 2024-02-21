import { omit } from 'radash'
import { QueryClient } from '@tanstack/react-query'
// import { fillOption } from '@/lib/core/fillOption'
// import { Args } from '../mutationFn'
import { data } from './data'

type Variables = {
  [key: string]: any
}

export const onMutate = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  newThreadMessage: Variables,
) => {
  const queryKey = ['threadMessages', omit(newThreadMessage, ['content'])]
  await queryClient.cancelQueries({ queryKey })
  //   fillOption({
  //     value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
  //     key: 'queryKey',
  //     meta: context.meta,
  //     args: newThreadMessage,
  //   })
  // )

  const prevThreadMessages = queryClient.getQueryData(queryKey)
  //   fillOption({
  //     value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
  //     key: 'queryKey',
  //     meta: context.meta,
  //     args: newThreadMessage,
  //   })
  // )

  queryClient.setQueryData(
    queryKey,
    // fillOption({
    //   value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
    //   key: 'queryKey',
    //   meta: context.meta,
    //   args: newThreadMessage,
    // }),
    data({ newThreadMessage })
  )

  return {
    prevThreadMessages,
    newThreadMessage,
    // meta: context.meta,
  }
}
