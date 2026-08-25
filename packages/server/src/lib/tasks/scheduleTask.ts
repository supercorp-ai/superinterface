import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { createHash } from 'node:crypto'

import { type Task, type PrismaClient } from '@prisma/client'
import { getNextOccurrence } from './getNextOccurrence'
import type { TaskScheduler } from './schedulers/types'

dayjs.extend(utc)
dayjs.extend(timezone)

export const TASK_DELIVERY_RETRIES = 2
export const TASK_DELIVERY_TIMEOUT = '15m'

export const getTaskDeliveryDeduplicationId = ({
  task,
  nextIso,
}: {
  task: Task
  nextIso: string
}) => {
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        taskId: task.id,
        message: task.message,
        schedule: task.schedule,
        nextIso,
      }),
    )
    .digest('hex')

  return `task-${digest}`
}

export const scheduleTask = async ({
  task,
  prisma,
  scheduler,
  callbackUrl = `${process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL}/api/cloud/tasks/callback`,
}: {
  task: Task
  prisma: PrismaClient
  scheduler: TaskScheduler
  callbackUrl?: string
}) => {
  if (!task.schedule || typeof task.schedule !== 'object') return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextIso = getNextOccurrence({ schedule: task.schedule as any })
  if (!nextIso) return

  const next = dayjs.utc(nextIso)
  if (!next.isValid()) return

  const delay = Math.max(0, next.diff(dayjs.utc(), 'second'))
  const deduplicationId = getTaskDeliveryDeduplicationId({ task, nextIso })

  const { messageId } = await scheduler.publishJSON({
    url: callbackUrl,
    body: { taskId: task.id },
    delay,
    deduplicationId,
    retries: TASK_DELIVERY_RETRIES,
    timeout: TASK_DELIVERY_TIMEOUT,
  })

  try {
    await prisma.task.update({
      where: { id: task.id },
      data: { qstashMessageId: messageId },
    })
  } catch (error: unknown) {
    // Task was deleted while callback was in flight (e.g. continuous mode toggled off)
    if (
      error instanceof Error &&
      'code' in error &&
      (error as unknown as Record<string, unknown>).code === 'P2025'
    ) {
      await scheduler.messages.delete(messageId)
      return
    }
    throw error
  }
}
