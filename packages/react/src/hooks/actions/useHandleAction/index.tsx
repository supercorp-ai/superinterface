import {
  UseMutationOptions,
  useMutation,
} from '@tanstack/react-query'
import { extendOptions } from '@/lib/core/extendOptions'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Run } from '@/types'
import { useMeta } from '@/hooks/metas/useMeta'

type Args = (args: any) => UseMutationOptions<{ run: Run }>

// @ts-ignore-next-line
export const useHandleAction = (args: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { meta } = useMeta()

  const props = useMutation(extendOptions({
    defaultOptions: superinterfaceContext.mutationOptions.handleAction,
    args,
    meta,
  }))

  return {
    ...props,
    handleAction: props.mutate,
  }
}
