import { JSONParser } from '@streamparser/json-whatwg'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { handleResponse } from './handleResponse'

export const mutationFn = ({
  superinterfaceContext,
  queryClient,
  threadContext,
  audioThreadContext,
}: {
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
  queryClient: ReturnType<typeof useQueryClient>
  threadContext: ReturnType<typeof useThreadContext>
  audioThreadContext: ReturnType<typeof useAudioThreadContext>
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
      audioThreadContext,
    })
  }
}
