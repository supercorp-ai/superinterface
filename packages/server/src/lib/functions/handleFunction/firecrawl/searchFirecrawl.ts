import type { FirecrawlCall } from './types'

const FIRECRAWL_SEARCH_URL = 'https://api.firecrawl.dev/v0/search'

// Searches through the Firecrawl search API, which the SDK doesn't cover,
// with the handler's options merged with the model's.
export const searchFirecrawl = async ({
  firecrawlHandler: { apiKey, body },
  args,
}: FirecrawlCall) => {
  const response = await fetch(FIRECRAWL_SEARCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      ...args,
    }),
  })

  return response.json()
}
