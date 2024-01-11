import {
  UseMutationOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Message } from '@/types'
import { extendOptions } from '@/lib/core/extendOptions'

type Args = (args: any) => UseMutationOptions<{ message: Message }>

// @ts-ignore-next-line
export const useCreateMessage = (args: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const queryClient = useQueryClient()

  const props = useMutation(extendOptions({
    defaultOptions: superinterfaceContext.mutationOptions.createMessage,
    args,
    meta: {
      superinterfaceContext,
      queryClient,
    },
  }))
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
