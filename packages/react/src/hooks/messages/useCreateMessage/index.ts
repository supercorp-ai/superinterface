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

  const options = mergeOptions(
    defaultMutationOptions({ queryClient, ...mutationOptions }),
    superinterfaceContext.mutationOptions.createMessage({ queryClient, ...mutationOptions }),
    typeof mutationOptions === 'function' ? mutationOptions({ queryClient }) : mutationOptions,
  )
  console.log({ options })

  const props = useMutation(options)
  // console.log({
  //   props,
  //   options,
  //   defaultMutationOptions,
  //   sup: superinterfaceContext.mutationOptions.createMessage({ queryClient }),
  //   mutationOptions
  // })

  return {
    ...props,
    createMessage: props.mutateAsync,
  }
}
