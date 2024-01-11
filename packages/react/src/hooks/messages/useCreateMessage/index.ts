import {
  UseMutationOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Message } from '@/types'
import { mergeOptions } from '@/lib/core/mergeOptions'
import { mutationOptions as defaultMutationOptions } from '@/hooks/messages/useCreateMessage/lib/mutationOptions'

type Args = (args: any) => UseMutationOptions<{ message: Message }>

// @ts-ignore-next-line
export const useCreateMessage = (mutationOptions: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const queryClient = useQueryClient()

  const props = useMutation(mergeOptions(
    defaultMutationOptions,
    superinterfaceContext.mutationOptions.createMessage({ queryClient }),
    typeof mutationOptions === 'function' ? mutationOptions({ queryClient }) : mutationOptions,
  ))

  return {
    ...props,
    createMessage: props.mutateAsync,
  }
}
