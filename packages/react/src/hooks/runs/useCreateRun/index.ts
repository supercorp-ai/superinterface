import {
  UseMutationOptions,
  useMutation,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Run } from '@/types'
import { extendOptions } from '@/lib/core/extendOptions'
import { useMeta } from '@/hooks/metas/useMeta'

type Args = (args: any) => UseMutationOptions<{ run: Run }>

// @ts-ignore-next-line
export const useCreateRun = (args: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { meta } = useMeta()

  const props = useMutation(extendOptions({
    defaultOptions: superinterfaceContext.mutationOptions.createRun,
    args,
    meta,
  }))

  return {
    ...props,
    createRun: props.mutate,
  }
}
