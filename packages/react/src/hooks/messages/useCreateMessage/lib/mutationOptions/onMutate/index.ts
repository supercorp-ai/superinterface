import OpenAI from 'openai'
import { omit } from 'radash'
import { QueryClient } from '@tanstack/react-query'
import { data } from './data'

type Variables = {
  content: string
  attachments: OpenAI.Beta.Threads.Messages.Message['attachments'] | undefined
  [key: string]: any
}

export const onMutate = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  newMessage: Variables,
) => {
  const queryKey = ['messages', omit(newMessage, ['content', 'attachments'])]
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
