import {
  Assistant,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'

export const getTaskToolKey = async ({
  thread,
  assistant,
  keyTemplate,
  prisma,
}: {
  thread: Thread
  assistant: Assistant
  keyTemplate: string | null
  prisma: PrismaClient
}) => {
  const missing: string[] = []
  const key = (keyTemplate || '').replace(/{{\s*([\w-]+)\s*}}/g, (_, k) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (k in (thread.metadata || {})) return String((thread.metadata as any)[k])
    if (k === 'threadId') return thread.id
    if (k === 'assistantId') return assistant.id
    missing.push(k)
    return `{{${k}}}`
  })

  if (missing.length) {
    const message = `Missing variables in key template: ${missing.join(', ')}`

    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return { ok: false as const, error: message }
  }

  return { ok: true as const, key }
}
