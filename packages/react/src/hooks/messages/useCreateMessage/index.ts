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

export const useCreateMessage = ({
  onError = () => {},
}: {
  onError?: (error: unknown) => void
} = {
  onError: () => {},
}) => {
  const queryClient = useQueryClient()
  const superinterfaceContext = useSuperinterfaceContext()
  const threadContext = useThreadContext()

  const props = useMutation({
    onMutate: onMutate({ queryClient }),
    // onSettled: onSettled({ queryClient }),
    onError,
    ...mutationOptions({
      mutationKeyBase: ['createMessage'],
      path: '/messages',
      queryClient,
      threadContext,
      superinterfaceContext,
    }),
  })

  return {
    ...props,
    createMessage: partob(props.mutateAsync, threadContext.variables),
  }
}
