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
  newThreadMessage: Variables,
) => {
  const queryKey = ['threadMessages', omit(newThreadMessage, ['content'])]
  await queryClient.cancelQueries({ queryKey })

  const prevThreadMessages = queryClient.getQueryData(queryKey)

  queryClient.setQueryData(
    queryKey,
    data({ newThreadMessage })
  )

  return {
    prevThreadMessages,
    newThreadMessage,
  }
}
