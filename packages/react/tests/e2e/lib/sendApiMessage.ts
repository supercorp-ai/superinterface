import { inject } from 'vitest'
import { readMessageEvents } from './readMessageEvents'

// Sends a message straight to POST /api/messages, as another client would,
// and waits for the whole run to stream back.
export const sendApiMessage = async ({
  body,
}: {
  body: Record<string, unknown>
}) => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(`${apiBaseUrl}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (response.status !== 200) {
    throw new Error(`POST /messages failed: ${await response.text()}`)
  }

  return readMessageEvents({ response })
}
