import { omit } from 'radash'
import { QueryClient } from '@tanstack/react-query'
import { data } from './data'

type Variables = {
  content: string
  [key: string]: any
}

export const onMutate = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  newMessage: Variables,
) => {
  const queryKey = ['messages', omit(newMessage, ['content'])]
  await queryClient.cancelQueries({ queryKey })

  const prevMessages = queryClient.getQueryData(queryKey)

  queryClient.setQueryData(
    queryKey,
    data({ newMessage })
  )

  return {
    prevMessages,
    newMessage,
  }
}
