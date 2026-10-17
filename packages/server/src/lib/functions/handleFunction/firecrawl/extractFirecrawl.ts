import type { FirecrawlCall } from './types'
import { firecrawlApp } from './firecrawlApp'
import { splitUrlArgs } from './splitUrlArgs'

// Extracts from the URL through a scrape in the extract format, with the
// model's options only.
export const extractFirecrawl = ({ firecrawlHandler, args }: FirecrawlCall) => {
  const { url, options } = splitUrlArgs({ args })
  const firecrawl = firecrawlApp({ firecrawlHandler })

  return firecrawl.scrapeUrl(url, {
    formats: ['extract'],
    ...options,
  })
}
