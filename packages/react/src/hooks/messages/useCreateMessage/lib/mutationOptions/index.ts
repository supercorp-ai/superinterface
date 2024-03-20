import _ from 'lodash'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { onMutate } from './onMutate'
import { mutationFn } from './mutationFn'

export const mutationOptions = ({
  queryClient,
  threadContext,
  audioThreadContext,
  superinterfaceContext,
  onError,
}: {
  queryClient: ReturnType<typeof useQueryClient>,
  threadContext: ReturnType<typeof useThreadContext>,
  audioThreadContext: ReturnType<typeof useAudioThreadContext>,
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>,
  onError: (error: unknown) => void
}) => {
  const mutationKey = ['createMessage', threadContext.variables]

  return {
    mutationFn: mutationFn({
      queryClient,
      superinterfaceContext,
      threadContext,
      audioThreadContext,
    }),
    onMutate: onMutate({ queryClient }),
    onError,
    ...threadContext.defaultOptions.mutations,
    ...queryClient.getMutationDefaults(mutationKey),
    mutationKey,
  }
}
