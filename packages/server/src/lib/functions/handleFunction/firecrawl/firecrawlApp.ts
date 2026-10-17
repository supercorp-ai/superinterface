import type { FirecrawlHandler } from '@prisma/client'
import FirecrawlApp from '@mendable/firecrawl-js'

// A Firecrawl SDK client authenticated with the handler's API key.
export const firecrawlApp = ({
  firecrawlHandler: { apiKey },
}: {
  firecrawlHandler: FirecrawlHandler
}) => new FirecrawlApp({ apiKey })
