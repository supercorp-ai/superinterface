import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

type QueryFunctionArgs = {
  queryKey: Readonly<['assistants', { assistantId: string }]>
}

export const queryFn =
  ({
    superinterfaceContext,
  }: {
    superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
  }) =>
  async ({ queryKey }: QueryFunctionArgs) => {
    const [_key, { assistantId }] = queryKey

    const { publicApiKey } = superinterfaceContext.variables
    const params = new URLSearchParams(publicApiKey ? { publicApiKey } : {})
    const query = params.toString()

    return fetch(
      `${superinterfaceContext.baseUrl}/assistants/${assistantId}${query ? `?${query}` : ''}`,
    ).then(async (response) => {
      if (response.status !== 200) {
        try {
          const errorResponse = (await response.json()) as { error: string }
          throw new Error(errorResponse.error)
        } catch (error) {
          throw new Error('Failed to fetch')
        }
      }

      return response.json() as Promise<any>
    })
  }
