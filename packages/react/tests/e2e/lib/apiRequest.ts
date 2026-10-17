import { inject } from 'vitest'

// Calls the test server's API with a key, failing on any non-2xx response.
export const apiRequest = async ({
  method = 'POST',
  path,
  apiKey,
  body,
}: {
  method?: string
  path: string
  apiKey: string
  body?: unknown
}) => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const json = await response.json()

  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(json)}`)
  }

  return json
}
