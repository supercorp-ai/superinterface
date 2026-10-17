import type { NextResponse } from 'next/server'
import type { PrismaClient, StorageProviderType } from '@prisma/client'
import { storageThreadId as getStorageThreadId } from '@/lib/threads/storageThreadId'
import { managedOpenaiThreadId } from '@/lib/threads/managedOpenaiThreadId'
import { threadErrorResponse } from '@/lib/threads/threadErrorResponse'

type ResolvedStorageThreadId =
  | { storageThreadId: string; errorResponse: null }
  | { errorResponse: NextResponse }

// Finds the id the storage provider knows the thread by, creating a managed
// OpenAI thread when the provider supports one and none exists yet.
export const resolveStorageThreadId = async ({
  assistant,
  thread,
  prisma,
  supportsManagedThreadId,
}: {
  assistant: Parameters<typeof managedOpenaiThreadId>[0]['assistant']
  thread: Parameters<typeof getStorageThreadId>[0]['thread']
  prisma: PrismaClient
  supportsManagedThreadId: ({
    storageProviderType,
  }: {
    storageProviderType: StorageProviderType
  }) => boolean
}): Promise<ResolvedStorageThreadId> => {
  // Only throws for storage provider types the database cannot hold.
  let storageThreadId = getStorageThreadId({ thread })

  const needsManagedThreadId =
    !storageThreadId &&
    supportsManagedThreadId({
      storageProviderType: assistant.storageProviderType,
    })

  if (needsManagedThreadId) {
    try {
      storageThreadId = await managedOpenaiThreadId({
        assistant,
        threadId: thread.id,
        prisma,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return {
        errorResponse: threadErrorResponse({
          prisma,
          assistant,
          thread,
          logMessage: `Failed to get managed openai thread id: ${error.message}`,
          error: 'Failed to get managed openai thread id.',
        }),
      }
    }
  }

  if (!storageThreadId) {
    return {
      errorResponse: threadErrorResponse({
        prisma,
        assistant,
        thread,
        logMessage: 'Invalid thread configuration.',
        error: 'Invalid thread configuration.',
      }),
    }
  }

  return { storageThreadId, errorResponse: null }
}
