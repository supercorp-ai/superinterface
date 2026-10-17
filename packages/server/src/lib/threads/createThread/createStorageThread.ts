import type OpenAI from 'openai'
import {
  StorageProviderType,
  type Prisma,
  type PrismaClient,
} from '@prisma/client'
import { createStorageProviderThread } from './createStorageProviderThread'
import { threadMetadata } from './threadMetadata'
import type { SerializedMetadata } from '@/lib/metadata/serializedMetadata'

// Creates the thread row and the storage provider's thread. Superinterface
// Cloud storage writes the row itself, so the two share an id. Other storage
// providers get the row first, so their thread's metadata can point back at
// it, and the row is not removed if their thread fails to be created.
export const createStorageThread = async ({
  client,
  assistant,
  prisma,
  metadata,
}: {
  client: OpenAI
  assistant: Prisma.AssistantGetPayload<{
    include: {
      initialMessages: true
    }
  }>
  prisma: PrismaClient
  metadata: SerializedMetadata
}) => {
  if (
    assistant.storageProviderType === StorageProviderType.SUPERINTERFACE_CLOUD
  ) {
    const storageProviderThread = await createStorageProviderThread({
      client,
      assistant,
      metadata: {
        assistantId: assistant.id,
        ...metadata,
      },
    })

    return {
      threadId: storageProviderThread.id,
      storageThreadId: storageProviderThread.id,
    }
  }

  const thread = await prisma.thread.create({
    data: {
      assistantId: assistant.id,
      metadata,
    },
  })

  const storageProviderThread = await createStorageProviderThread({
    client,
    assistant,
    metadata: threadMetadata({
      assistantId: assistant.id,
      threadId: thread.id,
      metadata,
    }),
  })

  return {
    threadId: thread.id,
    storageThreadId: storageProviderThread.id,
  }
}
