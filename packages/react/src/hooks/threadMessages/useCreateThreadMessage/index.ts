import { partob } from 'radash'
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { mutationOptions } from '@/lib/threads/mutationOptions'

export const useCreateThreadMessage = () => {
  const queryClient = useQueryClient()
  const superinterfaceContext = useSuperinterfaceContext()
  const threadContext = useThreadContext()

  const props = useMutation(mutationOptions({
    mutationKeyBase: ['createThreadMessage'],
    path: '/thread-messages',
    queryClient,
    threadContext,
    superinterfaceContext,
  }))

  return {
    ...props,
    createThreadMessage: partob(props.mutateAsync, threadContext.variables),
  }
}
