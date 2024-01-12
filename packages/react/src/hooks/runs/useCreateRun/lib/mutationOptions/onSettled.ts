import { Response } from './mutationFn'
import { fillOption } from '@/lib/core/fillOption'

type Variables = {
  assistantConversationId: string
}

type Context = {
  meta: any
}

export const onSettled = async (
  _data: Response,
  _error: any,
  variables: Variables,
  context: Context,
) => {
  await context.meta.queryClient.invalidateQueries({
    queryKey: fillOption({
      value: context.meta.superinterfaceContext.queryOptions.messages.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: variables,
    }),
  })

  await context.meta.queryClient.invalidateQueries({
    queryKey: fillOption({
      value: context.meta.superinterfaceContext.queryOptions.runs.queryKey,
      key: 'queryKey',
      meta: context.meta,
      args: variables,
    }),
  })
}
