import { z } from 'zod'
import { MessageRole } from '@prisma/client'

export const initialMessagesSchema = z.object({
  initialMessages: z.array(
    z.object({
      content: z.string().min(1),
      role: z.nativeEnum(MessageRole),
    }),
  ),
})
