import { QueryClient } from '@tanstack/react-query'
// import { mutationFn } from './mutationFn'
import { onSuccess } from './onSuccess'
import { onSettled } from './onSettled'

type Args = {
  queryClient: QueryClient
}

export const mutationOptions = ({
  queryClient,
}: Args) => ({
  // mutationFn,
  onSuccess: onSuccess({ queryClient }),
  onSettled: onSettled({ queryClient }),
})
