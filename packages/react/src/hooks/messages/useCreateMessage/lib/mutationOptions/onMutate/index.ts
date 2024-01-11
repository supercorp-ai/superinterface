import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { Args as NewMessageArgs } from '../mutationFn'
import { data } from './data'

export const onMutate = async (
  newMessage: NewMessageArgs,
) => {
  // TODO
  // await queryClient.cancelQueries(messagesQueryKey(args))
  //
  // const prevMessages = queryClient.getQueryData(messagesQueryKey())
  //
  // queryClient.setQueryData(
  //   messagesQueryKey(),
  //   data({ newMessage })
  // )
  //
  // return {
  //   prevMessages,
  //   newMessage,
  // }
}
