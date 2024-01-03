import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from '@tanstack/react-query'
import { mutationOptions } from './lib/mutationOptions'
import { Message } from '@/types'

type Args = {
  createMessageMutationOptions: UseMutationOptions<{ message: Message }>
}

export const useCreateMessage = ({
  createMessageMutationOptions,
}: Args) => {
  const queryClient = useQueryClient()

  // @ts-ignore-next-line
  const mutationProps = useMutation({
    ...mutationOptions({
      queryClient,
    }),
    ...createMessageMutationOptions,
  })

  return {
    ...mutationProps,
    createMessage: mutationProps.mutateAsync,
  }
}
