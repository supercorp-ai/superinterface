import {
  useSuperinterfaceContext,
} from '@superinterface/react'

type QueryFunctionArgs = {
  queryKey: Readonly<['assistants', { assistantId: string }]>
}

export const queryFn = ({
  superinterfaceContext,
}: {
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => async ({
  queryKey,
}: QueryFunctionArgs) => {
  const [_key, { assistantId }] = queryKey

  const params = new URLSearchParams({
    publicApiKey: superinterfaceContext.publicApiKey,
  })

  return fetch(`${superinterfaceContext.baseUrl}/assistants/${assistantId}?${params}`)
    .then(async (response) => {
      if (response.status !== 200) {
        try {
          const errorResponse = await response.json() as { error: string }
          throw new Error(errorResponse.error)
        } catch (error) {
          throw new Error('Failed to fetch')
        }
      }

      return response.json() as Promise<any>
    })
}
