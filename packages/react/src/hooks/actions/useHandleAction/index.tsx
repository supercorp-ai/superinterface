import {
  UseMutationOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { extendOptions } from '@/lib/core/extendOptions'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Run } from '@/types'

type Args = (args: any) => UseMutationOptions<{ run: Run }>

// @ts-ignore-next-line
export const useHandleAction = (args: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const queryClient = useQueryClient()

  const props = useMutation(extendOptions({
    defaultOptions: superinterfaceContext.mutationOptions.handleAction,
    args,
    meta: {
      superinterfaceContext,
      queryClient,
    },
  }))

  return {
    ...props,
    handleAction: props.mutate,
  }
}
