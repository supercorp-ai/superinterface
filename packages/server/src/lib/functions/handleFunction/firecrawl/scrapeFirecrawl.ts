import type { FirecrawlCall } from './types'
import { firecrawlApp } from './firecrawlApp'
import { splitUrlArgs } from './splitUrlArgs'
import { scrapeFormats } from './scrapeFormats'

// Scrapes the URL with the handler's options merged with the model's. The
// handler's formats win over the model's.
export const scrapeFirecrawl = ({ firecrawlHandler, args }: FirecrawlCall) => {
  const { url, options } = splitUrlArgs({ args })
  const { body } = firecrawlHandler
  const firecrawl = firecrawlApp({ firecrawlHandler })

  return firecrawl.scrapeUrl(url, {
    ...body,
    ...options,
    formats: scrapeFormats({ body }),
  })
}
