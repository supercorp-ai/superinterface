import type { PrismaClient } from '@prisma/client'
import type { TaskScheduler } from '@/lib/tasks/schedulers/types'
import { deleteScheduledTask } from '@/lib/tasks/deleteScheduledTask'
import type { TaskRouteProps } from './authorizeTaskRequest'
import { findRequestTask } from './findRequestTask'

export const deleteRequestTask = async ({
  prisma,
  scheduler,
  props,
}: {
  prisma: PrismaClient
  scheduler: TaskScheduler
  props: TaskRouteProps
}) => {
  const existing = await findRequestTask({ prisma, props })
  if (!existing.ok) return existing

  return deleteScheduledTask({ prisma, scheduler, existingTask: existing.task })
}
