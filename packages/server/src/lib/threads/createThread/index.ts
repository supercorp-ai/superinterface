import OpenAI from 'openai'
import { PrismaClient, Prisma } from '@prisma/client'
import { serializeMetadata } from '@/lib/metadata/serializeMetadata'
import type { ThreadVariables } from '@/lib/threads/threadVariables'
import { createStorageThread } from './createStorageThread'
import { storageThreadIdData } from './storageThreadIdData'
import { threadMetadata } from './threadMetadata'

export const createThread = async ({
  client,
  assistant,
  prisma,
  variables,
}: {
  client: OpenAI
  assistant: Prisma.AssistantGetPayload<{
    include: {
      initialMessages: true
      modelProvider: true
    }
  }>
  prisma: PrismaClient
  variables: ThreadVariables
}) => {
  const metadata = serializeMetadata({
    variables,
    workspaceId: assistant.workspaceId,
    prisma,
  })

  const { threadId, storageThreadId } = await createStorageThread({
    client,
    assistant,
    prisma,
    metadata,
  })

  return prisma.thread.update({
    where: {
      id: threadId,
    },
    include: {
      assistant: {
        select: {
          storageProviderType: true,
        },
      },
    },
    data: {
      ...storageThreadIdData({
        storageProviderType: assistant.storageProviderType,
        storageThreadId,
      }),
      metadata: threadMetadata({
        assistantId: assistant.id,
        threadId,
        metadata,
      }),
    },
  })
}
