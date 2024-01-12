import { fillOption } from '@/lib/core/fillOption'
import { Args } from '../mutationFn'
import { data } from './data'

export const onMutate = async (
  newMessage: Args,
  context: any,
) => {
  await context.meta.queryClient.cancelQueries(
    fillOption({
      value: context.meta.superinterfaceContext.queryOptions.messages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: newMessage,
    })
  )

  const prevMessages = context.meta.queryClient.getQueryData(
    fillOption({
      value: context.meta.superinterfaceContext.queryOptions.messages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: newMessage,
    })
  )

  context.meta.queryClient.setQueryData(
    fillOption({
      value: context.meta.superinterfaceContext.queryOptions.messages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: newMessage,
    }),
    data({ newMessage })
  )

  return {
    prevMessages,
    newMessage,
    meta: context.meta,
  }
}
