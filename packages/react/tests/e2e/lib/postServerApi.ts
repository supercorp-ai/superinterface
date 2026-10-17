import { inject } from 'vitest'

// POSTs `body` to the test server's API with a bearer key, and returns the
// parsed JSON response (throwing on a non-2xx status).
export const postServerApi = async ({
  path,
  apiKey,
  body,
}: {
  path: string
  apiKey: string
  body: Record<string, unknown>
}) => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await response.json()

  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${JSON.stringify(json)}`)
  }

  return json
}
