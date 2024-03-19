import _ from 'lodash'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { onMutate } from './onMutate'
import { mutationFn } from './mutationFn'

export const mutationOptions = ({
  queryClient,
  threadContext,
  superinterfaceContext,
  onError,
}: {
  queryClient: ReturnType<typeof useQueryClient>,
  threadContext: ReturnType<typeof useThreadContext>,
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>,
  onError: (error: unknown) => void
}) => {
  const mutationKey = ['createMessage', threadContext.variables]

  return {
    mutationFn: mutationFn({
      queryClient,
      superinterfaceContext,
      threadContext,
    }),
    onMutate: onMutate({ queryClient }),
    onError,
    ...threadContext.defaultOptions.mutations,
    ...queryClient.getMutationDefaults(mutationKey),
    mutationKey,
  }
}
