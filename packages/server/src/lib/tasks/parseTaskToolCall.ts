import OpenAI from 'openai'
import type { Assistant, Thread, PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { parseTaskToolArgs } from './parseTaskToolArgs'
import { getTaskToolKey } from './getTaskToolKey'

export type TaskToolCallContext = {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}

export const parseTaskToolCall = async <Schema extends z.ZodTypeAny>({
  context,
  keyTemplate,
  schema,
}: {
  context: TaskToolCallContext
  keyTemplate: string | null
  schema: Schema
}) => {
  const parsedArgs = parseTaskToolArgs(context)
  if (!parsedArgs.ok) return parsedArgs

  const check = schema.safeParse(parsedArgs.args)
  if (!check.success) {
    return { ok: false as const, error: check.error.toString() }
  }

  const taskToolKey = await getTaskToolKey({ ...context, keyTemplate })
  if (!taskToolKey.ok) return taskToolKey

  return {
    ok: true as const,
    args: check.data as z.infer<Schema>,
    key: taskToolKey.key,
  }
}
