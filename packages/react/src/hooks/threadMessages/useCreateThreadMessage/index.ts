import { partob } from 'radash'
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { mutationOptions } from '@/lib/threads/mutationOptions'
import { onMutate } from './lib/mutationOptions/onMutate'
import { onSettled } from './lib/mutationOptions/onSettled'

export const useCreateThreadMessage = () => {
  const queryClient = useQueryClient()
  const superinterfaceContext = useSuperinterfaceContext()
  const threadContext = useThreadContext()

  const props = useMutation({
    onMutate: onMutate({ queryClient }),
    onSettled: onSettled({ queryClient }),
    ...mutationOptions({
      mutationKeyBase: ['createThreadMessage'],
      path: '/thread-messages',
      queryClient,
      threadContext,
      superinterfaceContext,
    }),
  })

  return {
    ...props,
    createThreadMessage: partob(props.mutateAsync, threadContext.variables),
  }
}
