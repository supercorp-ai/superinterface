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
}) => {
  const mutationKey = [...mutationKeyBase, threadContext.variables]

  return {
    mutationFn: (variables: VariablesArgs) => (
      fetch(`${superinterfaceContext.baseUrl}${path}`, {
        method: 'POST',
        body: JSON.stringify(variables),
        credentials: 'include',
        ...(superinterfaceContext.publicApiKey ? {
          headers: {
            Authorization: `Bearer ${superinterfaceContext.publicApiKey}`,
          },
        } : {}),
      }).then(async (response) => {
        if (response.status !== 200) {
          try {
            const errorResponse = await response.json() as { error: string }
            throw new Error(errorResponse.error)
          } catch (error) {
            throw new Error('Failed to fetch')
          }
        }

        return response.json()
      })
    ),
    ...queryClient.getMutationDefaults(mutationKey),
    mutationKey,
    ...threadContext.defaultOptions.mutations,
  }
}
