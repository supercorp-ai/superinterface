import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { Args as NewMessageArgs } from '../mutationFn'
import { data } from './data'

type Args = {
  queryClient: any
}

export const onMutate = ({
  queryClient,
  ...args
}: Args) => async (newMessage: NewMessageArgs, a, b) => {
  console.log({args, newMessage, a, b})
  await queryClient.cancelQueries(messagesQueryKey(args))

  const prevMessages = queryClient.getQueryData(messagesQueryKey())

  queryClient.setQueryData(
    messagesQueryKey(),
    data({ newMessage })
  )

  return {
    prevMessages,
    newMessage,
  }
}
