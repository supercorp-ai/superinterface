import type OpenAI from 'openai'
import type { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { createRunOpts } from '@/lib/runs/createRunOpts'
import { serializeError } from '@/lib/errors/serializeError'
import { threadErrorResponse } from '@/lib/threads/threadErrorResponse'
import type {
  CreateMessageAssistant,
  CreateMessageThread,
} from './createMessageAssistant'

export type RunStream = Awaited<
  ReturnType<OpenAI['beta']['threads']['runs']['create']>
>

type StartedRunStream =
  | { createRunStream: RunStream; errorResponse: null }
  | { errorResponse: NextResponse }

export const startRunStream = async ({
  assistantClient,
  storageThreadId,
  assistant,
  thread,
  prisma,
}: {
  assistantClient: OpenAI
  storageThreadId: string
  assistant: CreateMessageAssistant
  thread: CreateMessageThread
  prisma: PrismaClient
}): Promise<StartedRunStream> => {
  try {
    const createRunStream = await assistantClient.beta.threads.runs.create(
      storageThreadId,
      await createRunOpts({ assistant, thread, prisma }),
    )

    return { createRunStream, errorResponse: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(error)

    return {
      errorResponse: threadErrorResponse({
        prisma,
        assistant,
        thread,
        logMessage: `Failed to create run stream: ${serializeError({ error })}`,
        error: 'Failed to create run stream.',
      }),
    }
  }
}
