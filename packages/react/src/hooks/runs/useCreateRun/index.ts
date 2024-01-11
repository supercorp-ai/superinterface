import {
  UseMutationOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Run } from '@/types'
import { extendOptions } from '@/lib/core/extendOptions'

type Args = (args: any) => UseMutationOptions<{ run: Run }>

// @ts-ignore-next-line
export const useCreateRun = (args: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const queryClient = useQueryClient()

  const props = useMutation(extendOptions({
    defaultOptions: superinterfaceContext.mutationOptions.createRun,
    args,
    meta: {
      superinterfaceContext,
      queryClient,
    },
  }))

  return {
    ...props,
    createRun: props.mutate,
  }
}
