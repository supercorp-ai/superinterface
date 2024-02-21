import {
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

type VariablesArgs = {
  content: string
  [key: string]: any
}

export const mutationOptions = ({
  mutationKeyBase,
  path,
  queryClient,
  threadContext,
  superinterfaceContext,
}: {
  mutationKeyBase: string[]
  path: string,
  queryClient: ReturnType<typeof useQueryClient>,
  threadContext: ReturnType<typeof useThreadContext>,
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>,
}) => ({
  mutationFn: (variables: VariablesArgs) => (
    fetch(`${superinterfaceContext.baseUrl}${path}`, {
      method: 'POST',
      body: JSON.stringify(variables),
      credentials: 'include',
    }).then(res => res.json())
  ),
  ...queryClient.getMutationDefaults(mutationKeyBase),
  mutationKey: [...mutationKeyBase, threadContext.variables],
  ...threadContext.defaultOptions.mutations,
})
