import { omit } from 'radash'
import type { FunctionArguments } from '../parseFunctionArguments'

// Splits the URL to scrape or crawl from the rest of the model's arguments,
// which become Firecrawl options.
export const splitUrlArgs = ({ args }: { args: FunctionArguments }) => ({
  url: args.url as string,
  options: omit(args, ['url']),
})
