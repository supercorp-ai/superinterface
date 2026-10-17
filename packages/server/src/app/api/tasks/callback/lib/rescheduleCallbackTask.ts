import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { checkTaskDelivery } from '@/lib/tasks/checkTaskDelivery'
import { scheduleTask } from '@/lib/tasks/scheduleTask'
import type { TaskScheduler } from '@/lib/tasks/schedulers/types'
import type { TaskCallback } from './readTaskCallback'

// Schedules the next delivery unless the task was deleted or changed while
// it ran. Only reached from a delivery the callback route already accepted
// (QStash-signed outside tests) for a task it has just run.
export const rescheduleCallbackTask = async ({
  callback,
  prisma,
  scheduler,
  callbackUrl,
}: {
  callback: TaskCallback
  prisma: PrismaClient
  scheduler: TaskScheduler
  callbackUrl?: string
}) => {
  const latestDelivery = checkTaskDelivery({
    task: await prisma.task.findUnique({
      where: { id: callback.taskId },
    }),
    incomingMessageId: callback.incomingMessageId,
    staleReason: 'task_changed',
  })

  if (latestDelivery.ignoredResponse) return latestDelivery.ignoredResponse

  await scheduleTask({
    task: latestDelivery.task,
    prisma,
    scheduler,
    callbackUrl,
  })

  return NextResponse.json({ ok: true })
}
