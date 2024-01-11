import {
  UseMutationOptions,
  useMutation,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Message } from '@/types'
import { extendOptions } from '@/lib/core/extendOptions'
import { useMeta } from '@/hooks/metas/useMeta'

type Args = (args: any) => UseMutationOptions<{ message: Message }>

// @ts-ignore-next-line
export const useCreateMessage = (args: Args = () => {}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { meta } = useMeta()

  const props = useMutation(extendOptions({
    defaultOptions: superinterfaceContext.mutationOptions.createMessage,
    args,
    meta,
  }))

  return {
    ...props,
    createMessage: props.mutateAsync,
  }
}
