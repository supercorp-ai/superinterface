import { useCallback } from 'react'
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { mutationOptions } from './lib/mutationOptions'
import type { UseCreateMessageVariables } from '@/types'

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

  const createMessage = useCallback((variables: UseCreateMessageVariables) => (
    props.mutateAsync({
      ...threadContext.variables,
      ...variables,
    })
  ), [props.mutateAsync, threadContext.variables])

  return {
    ...props,
    createMessage,
  }
}
