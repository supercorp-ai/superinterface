import type { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { resolveStorageThreadId } from '@/lib/threads/resolveStorageThreadId'
import { supportsManagedOpenaiThreadId } from '@/lib/storageProviders/supportsManagedOpenaiThreadId'
import { findOrCreateThread } from './findOrCreateThread'
import type { ThreadVariables } from '@/lib/threads/threadVariables'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'
import type { OnSuccessCreateThread } from './onSuccessCreateThread'

type PreparedMessageThread =
  | {
      thread: CreateMessageThread
      isThreadCreated: boolean
      storageThreadId: string
      errorResponse: null
    }
  | { errorResponse: NextResponse }

// Finds or creates the thread the message goes to, along with the id its
// storage provider knows it by.
export const prepareMessageThread = async ({
  assistant,
  prisma,
  variables,
  onSuccessCreateThread,
}: {
  assistant: CreateMessageAssistant
  prisma: PrismaClient
  variables: ThreadVariables
  onSuccessCreateThread: OnSuccessCreateThread
}): Promise<PreparedMessageThread> => {
  const foundThread = await findOrCreateThread({
    assistant,
    prisma,
    variables,
    onSuccessCreateThread,
  })

  if (foundThread.errorResponse) return foundThread

  const { thread, isThreadCreated } = foundThread

  const resolved = await resolveStorageThreadId({
    assistant,
    thread,
    prisma,
    supportsManagedThreadId: supportsManagedOpenaiThreadId,
  })

  if (resolved.errorResponse) return resolved

  return {
    thread,
    isThreadCreated,
    storageThreadId: resolved.storageThreadId,
    errorResponse: null,
  }
}
