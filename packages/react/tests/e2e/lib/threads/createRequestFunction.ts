import { inject } from 'vitest'

// Adds a server-side function to the assistant through the public API. When
// the model calls `name`, the server sends a GET request to `url` and passes
// the response back to the model as the tool output.
export const createRequestFunction = async ({
  privateKey,
  assistantId,
  name,
  url,
}: {
  privateKey: string
  assistantId: string
  name: string
  url: string
}) => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(
    `${apiBaseUrl}/assistants/${assistantId}/functions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${privateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        openapiSpec: JSON.stringify({
          name,
          description: `Calls ${name}`,
          parameters: { type: 'object', properties: {} },
        }),
        handler: {
          type: 'REQUEST',
          requestHandler: {
            method: 'GET',
            url,
            headers: '{}',
            body: '{}',
          },
        },
      }),
    },
  )
  const json = await response.json()

  if (!response.ok) {
    throw new Error(`POST functions failed: ${JSON.stringify(json)}`)
  }

  return json.function
}
