import { inject } from 'vitest'

// Sends a user message through the server's public POST /api/messages, the
// way the client does, and waits for the streamed run to finish. Returns
// the thread id the server created or used. Extra `variables` are stored as
// the message's metadata, like extra variables sent by the client.
export const sendApiMessage = async ({
  publicKey,
  assistantId,
  threadId,
  content,
  variables = {},
}: {
  publicKey: string
  assistantId: string
  threadId?: string
  content: string
  variables?: Record<string, unknown>
}) => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(`${apiBaseUrl}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      publicApiKey: publicKey,
      assistantId,
      content,
      ...variables,
      ...(threadId ? { threadId } : {}),
    }),
  })
  const stream = await response.text()

  if (!response.ok) {
    throw new Error(`POST /messages failed: ${stream}`)
  }

  const createdThreadId = stream.match(/"threadId":"([^"]+)"/)?.[1]

  return { threadId: threadId ?? createdThreadId!, stream }
}
