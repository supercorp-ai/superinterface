import { QueryClient } from '@tanstack/react-query'
// import { mutationFn } from './mutationFn'
import { onSettled } from './onSettled'

type Args = {
  queryClient: QueryClient
}

export const mutationOptions = ({
  queryClient,
}: Args) => ({
  // mutationFn,
  onSettled: onSettled({ queryClient }),
})
