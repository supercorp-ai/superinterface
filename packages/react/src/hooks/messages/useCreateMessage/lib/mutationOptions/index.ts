import { QueryClient } from '@tanstack/react-query'
// import { mutationFn } from './mutationFn'
import { onMutate } from './onMutate'
import { onError } from './onError'
import { onSettled } from './onSettled'

type Args = {
  queryClient: QueryClient
}

export const mutationOptions = ({
  queryClient,
}: Args) => ({
  // mutationFn,
  onMutate: onMutate({
    queryClient,
  }),
  onError: onError({
    queryClient,
  }),
  onSettled: onSettled({
    queryClient,
  }),
})
