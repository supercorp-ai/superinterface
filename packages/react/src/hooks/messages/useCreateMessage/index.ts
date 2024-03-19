import { partob } from 'radash'
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { mutationOptions } from './lib/mutationOptions'

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

  const props = useMutation(mutationOptions({
    queryClient,
    threadContext,
    superinterfaceContext,
    onError,
  }))

  return {
    ...props,
    createMessage: partob(props.mutateAsync, threadContext.variables),
  }
}
