import type OpenAI from 'openai'
import type { Prisma } from '@prisma/client'
import { initialMessages } from './initialMessages'
import type { SerializedMetadata } from '@/lib/metadata/serializedMetadata'

// Creates the thread on the storage provider, seeded with the assistant's
// initial messages.
export const createStorageProviderThread = ({
  client,
  assistant,
  metadata,
}: {
  client: OpenAI
  assistant: Prisma.AssistantGetPayload<{
    include: {
      initialMessages: true
    }
  }>
  metadata: SerializedMetadata
}) =>
  client.beta.threads.create({
    messages: initialMessages({ assistant }),
    metadata,
  })
