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
  ...args
}: Args) => ({
  // mutationFn,
  onMutate: onMutate({
    queryClient,
    ...args,
  }),
  onError: onError({
    queryClient,
    ...args,
  }),
  onSettled: onSettled({
    queryClient,
    ...args,
  }),
})
