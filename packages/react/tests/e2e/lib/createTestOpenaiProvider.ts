import { inject } from 'vitest'
import { FAKE_OPENAI_API_KEY_PREFIX } from './startOpenaiRouter'

// Adds an OpenAI model provider to the workspace of `privateKey`. Its API key
// sends the server's OpenAI calls (e.g. audio transcriptions) to the fake
// OpenAI at `openaiBaseUrl` (see startOpenaiRouter).
export const createTestOpenaiProvider = async ({
  privateKey,
  openaiBaseUrl,
}: {
  privateKey: string
  openaiBaseUrl: string
}) => {
  const { apiBaseUrl } = inject('testServer')
  const response = await fetch(`${apiBaseUrl}/providers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${privateKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'OPENAI',
      name: 'Fake OpenAI',
      apiKey: `${FAKE_OPENAI_API_KEY_PREFIX}${openaiBaseUrl}`,
    }),
  })
  const json = await response.json()

  if (!response.ok) {
    throw new Error(`POST /providers failed: ${JSON.stringify(json)}`)
  }

  return json.provider
}
