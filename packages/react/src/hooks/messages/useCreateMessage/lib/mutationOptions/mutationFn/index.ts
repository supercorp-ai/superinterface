import { JSONParser } from '@streamparser/json-whatwg'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { handleResponse } from './handleResponse'

export const mutationFn = ({
  superinterfaceContext,
  queryClient,
  threadContext,
}: {
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
  queryClient: ReturnType<typeof useQueryClient>
  threadContext: ReturnType<typeof useThreadContext>
}) => async (variables: {
  content: string
  [key: string]: any
}) => {
  const response = await fetch(`${superinterfaceContext.baseUrl}/messages`, {
    method: 'POST',
    body: JSON.stringify(variables),
    credentials: 'include',
    ...(superinterfaceContext.publicApiKey ? {
      headers: {
        Authorization: `Bearer ${superinterfaceContext.publicApiKey}`,
      },
    } : {}),
  })

  if (response.body == null) {
    throw new Error('The response body is empty.');
  }

  const parser = new JSONParser({ stringBufferSize: undefined, paths: ['$'], separator: '' })
  const reader = response.body.pipeThrough(parser).getReader()

  const messagesQueryKey = ['messages', threadContext.variables]

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    handleResponse({
      value,
      messagesQueryKey,
      queryClient,
    })
  }
}