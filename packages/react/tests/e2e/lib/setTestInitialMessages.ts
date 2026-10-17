import { inject } from 'vitest'

// Replaces the assistant's initial messages, which the server returns as the
// first page of messages of a thread that does not exist yet.
export const setTestInitialMessages = async ({
  privateKey,
  assistantId,
  initialMessages,
}: {
  privateKey: string
  assistantId: string
  initialMessages: { role: 'ASSISTANT' | 'USER'; content: string }[]
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
    throw new Error(
      `PUT initial-messages failed: ${JSON.stringify(await response.json())}`,
    )
  }
}
