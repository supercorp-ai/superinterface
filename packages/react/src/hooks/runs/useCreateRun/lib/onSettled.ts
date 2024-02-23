import { QueryClient } from '@tanstack/react-query'

type Variables = {
  [key: string]: any
}

export const onSettled = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (
  _data: any,
  _error: any,
  variables: Variables,
) => {
  await queryClient.invalidateQueries({
    queryKey: ['threadMessages', variables],
  })

  await queryClient.invalidateQueries({
    queryKey: ['runs', variables],
  })
}
