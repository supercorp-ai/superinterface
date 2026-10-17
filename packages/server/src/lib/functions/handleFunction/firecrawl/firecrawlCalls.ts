import { FirecrawlHandlerType } from '@prisma/client'
import type { FirecrawlCall } from './types'
import { scrapeFirecrawl } from './scrapeFirecrawl'
import { crawlFirecrawl } from './crawlFirecrawl'
import { extractFirecrawl } from './extractFirecrawl'
import { searchFirecrawl } from './searchFirecrawl'

// The Firecrawl API call for each Firecrawl handler type.
export const firecrawlCalls: Record<
  FirecrawlHandlerType,
  (call: FirecrawlCall) => Promise<unknown>
> = {
  [FirecrawlHandlerType.SCRAPE]: scrapeFirecrawl,
  [FirecrawlHandlerType.CRAWL]: crawlFirecrawl,
  [FirecrawlHandlerType.EXTRACT]: extractFirecrawl,
  [FirecrawlHandlerType.SEARCH]: searchFirecrawl,
}
