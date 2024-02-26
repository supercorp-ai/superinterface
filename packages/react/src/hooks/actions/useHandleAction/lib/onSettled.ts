import { QueryClient } from '@tanstack/react-query'
import { Response } from '@/lib/actions/handleActionMutationFn'

type Variables = {
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
    queryKey: ['messages', variables],
  })

  await queryClient.invalidateQueries({
    queryKey: ['runs', variables],
  })
}
