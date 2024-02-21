import { partob } from 'radash'
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { mutationOptions } from '@/lib/threads/mutationOptions'
import { onSuccess } from './lib/mutationOptions/onSuccess'
import { onSettled } from './lib/mutationOptions/onSettled'

export const useCreateRun = () => {
  const queryClient = useQueryClient()
  const superinterfaceContext = useSuperinterfaceContext()
  const threadContext = useThreadContext()

  const props = useMutation({
    onSuccess: onSuccess({ queryClient }),
    onSettled: onSettled({ queryClient }),
    ...mutationOptions({
      mutationKeyBase: ['createRun'],
      path: '/runs',
      queryClient,
      threadContext,
      superinterfaceContext,
    }),
  })

  return {
    ...props,
    createRun: partob(props.mutate, threadContext.variables),
  }
}
