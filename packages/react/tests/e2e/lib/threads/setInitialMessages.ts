import { inject } from 'vitest'

// Replaces the assistant's initial messages through the public API. They
// show at the start of every new thread.
export const setInitialMessages = async ({
  privateKey,
  assistantId,
  initialMessages,
}: {
  privateKey: string
  assistantId: string
  initialMessages: Array<{ role: 'ASSISTANT' | 'USER'; content: string }>
}) => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(
    `${apiBaseUrl}/assistants/${assistantId}/initial-messages`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${privateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ initialMessages }),
    },
  )

  if (!response.ok) {
    throw new Error(`PUT initial-messages failed: ${await response.text()}`)
  }
}
