import OpenAI from 'openai'
import {
  Assistant,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'
import { scheduleSchema } from './scheduleSchema'
import { getNextOccurrence } from './getNextOccurrence'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const formatCurrentTime = ({
  schedule,
}: {
  schedule: PrismaJson.TaskSchedule
}) => {
  if (schedule.timeZone) {
    return `${dayjs().tz(schedule.timeZone).format()} in timezone ${schedule.timeZone}`
  }

  return `${dayjs().toISOString()} in UTC`
}

export const parseTaskToolArgs = ({
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let args: any = {}
  try {
    args = JSON.parse(toolCall.function.arguments || '{}')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message: `Failed parsing task function arguments: ${e.message}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })
    return { ok: false as const, error: 'Invalid arguments.' }
  }

  if (args && typeof args === 'object' && args.schedule !== undefined) {
    const parsed = scheduleSchema.safeParse(args.schedule)
    if (!parsed.success) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: 'Invalid schedule provided.',
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })
      return { ok: false as const, error: parsed.error.toString() }
    }

    const next = getNextOccurrence({ schedule: args.schedule })
    if (!next) {
      const message = `Schedule must be in the future. Current time: ${formatCurrentTime({ schedule: args.schedule })}`

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
  }

  return { ok: true as const, args }
}
