import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { Args as NewMessageArgs } from '../mutationFn'
import { data } from './data'

type Args = {
  queryClient: any
}

export const onMutate = ({
  queryClient,
}: Args) => async (newMessage: NewMessageArgs) => {
  await queryClient.cancelQueries(messagesQueryKey())

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
