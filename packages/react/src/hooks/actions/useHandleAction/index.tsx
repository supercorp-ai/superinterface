import {
  UseMutationOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { mergeOptions } from '@/lib/core/mergeOptions'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Run } from '@/types'
import { mutationOptions as defaultMutationOptions } from '@/hooks/actions/useHandleAction/lib/mutationOptions'

type Args = (args: any) => UseMutationOptions<{ run: Run }>

// @ts-ignore-next-line
export const useHandleAction = (mutationOptions: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const queryClient = useQueryClient()

  const mutationProps = useMutation(mergeOptions(
    defaultMutationOptions,
    superinterfaceContext.mutationOptions.createMessage({ queryClient }),
    // @ts-ignore-next-line
    typeof mutationOptions === 'function' ? mutationOptions({ queryClient }) : mutationOptions,
  ))

  return {
    ...mutationProps,
    handleAction: mutationProps.mutate,
  }
}
