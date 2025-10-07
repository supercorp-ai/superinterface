import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import { qstash } from '@/lib/upstash/qstash'
import { prisma } from '@/lib/prisma'
import { type Task } from '@prisma/client'
import { getNextOccurrence } from './getNextOccurrence'

dayjs.extend(utc)
dayjs.extend(timezone)

export const scheduleTask = async ({ task }: { task: Task }) => {
  if (!task.schedule || typeof task.schedule !== 'object') return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextIso = getNextOccurrence({ schedule: task.schedule as any })
  if (!nextIso) return

  const next = dayjs.utc(nextIso)
  if (!next.isValid()) return

  const delay = Math.max(0, next.diff(dayjs.utc(), 'second'))

  const { messageId } = await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_SUPERINTERFACE_BASE_URL}/api/cloud/tasks/callback`,
    body: { taskId: task.id },
    delay,
  })

  if (!messageId) throw new Error('Failed to schedule task: missing QStash ID')

  await prisma.task.update({
    where: { id: task.id },
    data: { qstashMessageId: messageId },
  })
}
