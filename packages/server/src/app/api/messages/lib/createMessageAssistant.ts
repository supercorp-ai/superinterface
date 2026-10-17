import type { findCreateMessageAssistant } from './findCreateMessageAssistant'

export type CreateMessageAssistant = NonNullable<
  Awaited<ReturnType<typeof findCreateMessageAssistant>>
>

export type CreateMessageThread = CreateMessageAssistant['threads'][number]
