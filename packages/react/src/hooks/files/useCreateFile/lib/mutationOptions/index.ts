import _ from 'lodash'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
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
  const mutationKey = ['createFile', threadContext.variables]

  return {
    mutationFn: mutationFn({
      queryClient,
      superinterfaceContext,
      threadContext,
    }),
    onError,
    ...threadContext.defaultOptions.mutations,
    ...queryClient.getMutationDefaults(mutationKey),
    mutationKey,
  }
}
