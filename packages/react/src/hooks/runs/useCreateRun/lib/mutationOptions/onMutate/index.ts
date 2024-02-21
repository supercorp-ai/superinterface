import { QueryClient } from '@tanstack/react-query'
import { data } from './data'

type Variables = {
  [key: string]: any
}

export const onMutate = ({
  queryClient,
}: {
  queryClient: QueryClient,
}) => async (variables: Variables) => {
  const queryKey = ['runs', variables]
  await queryClient.cancelQueries({ queryKey })

  const prevRuns = queryClient.getQueryData(queryKey)

  queryClient.setQueryData(
    queryKey,
    data({ variables })
  )

  return {
    prevRuns,
    variables,
  }
}
