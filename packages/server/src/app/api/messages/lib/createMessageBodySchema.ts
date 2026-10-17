import { z } from 'zod'

// Unknown keys pass through and become thread and message variables.
export const createMessageBodySchema = z
  .object({
    audioContent: z.any().optional(),
    content: z.any().optional(),
    attachments: z.array(z.any()).optional(),
    assistantId: z.string().optional(),
    publicApiKey: z.string().optional(),
    threadId: z.string().optional(),
  })
  .passthrough()
