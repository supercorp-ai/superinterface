import { fillOption } from '@/lib/core/fillOption'
import { Args } from '../mutationFn'
import { data } from './data'

export const onMutate = async (
  newThreadMessage: Args,
  context: any,
) => {
  await context.meta.queryClient.cancelQueries(
    fillOption({
      value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: newThreadMessage,
    })
  )

  const prevThreadMessages = context.meta.queryClient.getQueryData(
    fillOption({
      value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: newThreadMessage,
    })
  )

  context.meta.queryClient.setQueryData(
    fillOption({
      value: context.meta.superinterfaceContext.queryOptions.threadMessages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: newThreadMessage,
    }),
    data({ newThreadMessage })
  )

  return {
    prevThreadMessages,
    newThreadMessage,
    meta: context.meta,
  }
}
