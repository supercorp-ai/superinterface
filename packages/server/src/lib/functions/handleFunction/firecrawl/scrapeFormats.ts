import type { FirecrawlHandler } from '@prisma/client'
import type { ScrapeParams } from '@mendable/firecrawl-js'

type ScrapeFormats = NonNullable<ScrapeParams['formats']>

// The formats to scrape: the handler's, or markdown when it sets none.
export const scrapeFormats = ({
  body,
}: {
  body: FirecrawlHandler['body']
}): ScrapeFormats =>
  (body.formats as unknown as ScrapeFormats | undefined) ?? ['markdown']
