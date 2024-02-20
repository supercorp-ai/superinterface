import {
  UseMutationOptions,
  useMutation,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { ThreadMessage } from '@/types'
import { extendOptions } from '@/lib/core/extendOptions'
import { useMeta } from '@/hooks/metas/useMeta'

type Args = (args: any) => UseMutationOptions<{ threadMessage: ThreadMessage }>

// @ts-ignore-next-line
export const useCreateThreadMessage = (args: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { meta } = useMeta()

  const props = useMutation(extendOptions({
    defaultOptions: superinterfaceContext.mutationOptions.createThreadMessage,
    args,
    meta,
  }))

  return {
    ...props,
    createThreadMessage: props.mutateAsync,
  }
}
