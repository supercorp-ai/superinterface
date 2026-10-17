import type { OpenAI } from 'openai'
import { TruncationType, type Assistant } from '@prisma/client'

export const truncationStrategy = ({ assistant }: { assistant: Assistant }) => {
  if (assistant.truncationType === TruncationType.LAST_MESSAGES) {
    return {
      type: 'last_messages' as const,
      last_messages: assistant.truncationLastMessagesCount,
    }
  }

  if (assistant.truncationType === TruncationType.DISABLED) {
    // @ts-expect-error - compat
    return {
      type: 'disabled',
    } as OpenAI.Beta.Threads.Runs.Run.TruncationStrategy
  }

  return {
    type: 'auto' as const,
  }
}
