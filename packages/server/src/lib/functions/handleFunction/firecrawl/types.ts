import type { FirecrawlHandler } from '@prisma/client'
import type { FunctionArguments } from '../parseFunctionArguments'

// A Firecrawl handler called with the model's arguments.
export type FirecrawlCall = {
  firecrawlHandler: FirecrawlHandler
  args: FunctionArguments
}
