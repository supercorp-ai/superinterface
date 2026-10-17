import { inject } from 'vitest'
import type { MessagesPage } from '@/types'

// Lists a page of messages through GET /api/messages, i.e. what the server
// has persisted.
export const getApiMessages = async ({
  params,
}: {
  params: Record<string, string>
}): Promise<MessagesPage> => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(
    `${apiBaseUrl}/messages?${new URLSearchParams(params)}`,
  )

  if (response.status !== 200) {
    throw new Error(`GET /messages failed: ${await response.text()}`)
  }

  return response.json()
}
