import { type PrismaClient } from '@prisma/client'
import { managedOpenaiThreadId } from '@/lib/threads/managedOpenaiThreadId'
import { storageThreadId as getStorageThreadId } from '@/lib/threads/storageThreadId'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import type { HandlerAssistant } from './findHandlerAssistant'
import type { HandlerThread } from './createHandlerThread'

// Falls back to a managed OpenAI thread when an OpenAI Assistants thread has
// no storage thread yet. Throws only when the managed thread cannot be made.
export const resolveStorageThreadId = async ({
  assistant,
  thread,
  prisma,
}: {
  assistant: HandlerAssistant
  thread: HandlerThread
  prisma: PrismaClient
}) => {
  // The thread was created for an assistant with a known storage provider
  // type, so this never throws.
  const storageThreadId = getStorageThreadId({
    thread,
  })

  // Only OpenAI Assistants threads can fall back to a managed thread; any
  // other missing storage thread id is returned as is.
  if (
    storageThreadId ||
    !isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return storageThreadId
  }

  return managedOpenaiThreadId({
    assistant,
    threadId: thread.id,
    prisma,
  })
}
