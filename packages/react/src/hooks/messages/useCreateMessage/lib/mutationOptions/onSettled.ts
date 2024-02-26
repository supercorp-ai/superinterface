import { omit } from 'radash'
import { QueryClient } from '@tanstack/react-query'
import { Response } from '@/lib/messages/createMessageMutationFn'

type Variables = {
  content: string
  [key: string]: any
}

export const onSettled = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  _data: Response,
  _error: any,
  variables: Variables,
) => {
  await queryClient.invalidateQueries({
    queryKey: ['messages', omit(variables, ['content'])],
  })

  await queryClient.invalidateQueries({
    queryKey: ['runs', omit(variables, ['content'])],
  })
}
