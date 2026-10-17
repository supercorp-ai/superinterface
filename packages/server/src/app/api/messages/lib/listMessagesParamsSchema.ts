import { z } from 'zod'

export const listMessagesParamsSchema = z.object({
  publicApiKey: z.string().optional(),
  assistantId: z.string().optional(),
  threadId: z.string().optional(),
  pageParam: z.string().optional(),
  before: z.string().optional(),
})
