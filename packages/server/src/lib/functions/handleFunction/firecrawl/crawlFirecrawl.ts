import type { FirecrawlCall } from './types'
import { firecrawlApp } from './firecrawlApp'
import { splitUrlArgs } from './splitUrlArgs'

// Crawls from the URL with the handler's options merged with the model's and
// waits for the crawl to finish.
export const crawlFirecrawl = ({ firecrawlHandler, args }: FirecrawlCall) => {
  const { url, options } = splitUrlArgs({ args })
  const firecrawl = firecrawlApp({ firecrawlHandler })

  return firecrawl.crawlUrl(url, {
    ...firecrawlHandler.body,
    ...options,
  })
}
