import { apiRequest } from './apiRequest'

// Replaces the messages a new thread of the assistant starts with.
export const setInitialMessages = ({
  privateKey,
  assistantId,
  initialMessages,
}: {
  privateKey: string
  assistantId: string
  initialMessages: { role: 'USER' | 'ASSISTANT'; content: string }[]
}) =>
  apiRequest({
    method: 'PUT',
    path: `/assistants/${assistantId}/initial-messages`,
    apiKey: privateKey,
    body: { initialMessages },
  })
