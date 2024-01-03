import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { Args as NewMessageArgs } from './mutationFn'

type Args = {
  queryClient: any
}

type Context = {
  prevMessages: any
} | undefined

export const onError = ({
  queryClient,
}: Args) => async (
  _error: any,
  newMessage: NewMessageArgs,
  context: Context
) => {
  if (!context) {
    return
  }

  queryClient.setQueryData(
    messagesQueryKey(),
    context.prevMessages,
  )
}
