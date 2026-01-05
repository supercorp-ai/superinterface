import { JSONParser } from '@streamparser/json-whatwg'
import { useQueryClient } from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import type { UseCreateMessageVariables } from '@/types'
import { handleResponse } from './handleResponse'
import { body } from './body'

export const mutationFn =
  ({
    superinterfaceContext,
    queryClient,
    threadContext,
  }: {
    superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
    queryClient: ReturnType<typeof useQueryClient>
    threadContext: ReturnType<typeof useThreadContext>
  }) =>
  async (variables: UseCreateMessageVariables) => {
    const abortController = new AbortController()
    superinterfaceContext.createMessageAbortControllerRef.current =
      abortController

    try {
      const response = await fetch(
        `${superinterfaceContext.baseUrl}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(
            body({
              variables,
              superinterfaceContext,
            }),
          ),
          signal: abortController.signal,
        },
      )

      if (response.status !== 200) {
        try {
          const errorResponse = (await response.json()) as { error: string }
          throw new Error(errorResponse.error)
        } catch (error) {
          throw new Error(
            'Failed to send your message, try again. If you are the owner, check the logs.',
          )
        }
      }

      if (response.body == null) {
        throw new Error('The response body is empty.')
      }

      const parser = new JSONParser({
        stringBufferSize: undefined,
        paths: ['$'],
        separator: '',
      })
      const reader = response.body.pipeThrough(parser).getReader()

      const messagesQueryKey = ['messages', threadContext.variables]

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        handleResponse({
          value,
          messagesQueryKey,
          queryClient,
          superinterfaceContext,
        })
      }
    } finally {
      // Clear the ref after mutation completes (success, error, or abort)
      superinterfaceContext.createMessageAbortControllerRef.current = null
    }
  }
