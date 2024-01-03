import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from '@tanstack/react-query'
import { mutationOptions } from './lib/mutationOptions'
import { Run } from '@/types'

type Args = {
  createRunMutationOptions: UseMutationOptions<{ run: Run }>
}

export const useCreateRun = ({
  createRunMutationOptions,
}: Args) => {
  const queryClient = useQueryClient()

  // @ts-ignore-next-line
  const mutationProps = useMutation({
    ...mutationOptions({
      queryClient,
    }),
    ...createRunMutationOptions,
  })

  return {
    ...mutationProps,
    createRun: mutationProps.mutate,
  }
}
