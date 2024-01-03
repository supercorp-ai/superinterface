import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from '@tanstack/react-query'
import { mutationOptions } from './lib/mutationOptions'
import { Run } from '@/types'

type Args = {
  handleActionMutationOptions: UseMutationOptions<{ run: Run }>
}

export const useHandleAction = ({
  handleActionMutationOptions,
}: Args) => {
  const queryClient = useQueryClient()

  // @ts-ignore-next-line
  const mutationProps = useMutation({
    ...mutationOptions({
      queryClient,
    }),
    ...handleActionMutationOptions,
  })

  return {
    ...mutationProps,
    handleAction: mutationProps.mutate,
  }
}
