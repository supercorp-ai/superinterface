import type { NextRequest } from 'next/server'
import type { TaskScheduler } from '@/lib/tasks/schedulers/types'
import { updateScheduledTask } from '@/lib/tasks/updateScheduledTask'
import type { TaskRouteOptions } from './TaskRouteOptions'
import {
  authorizeTaskRequest,
  type TaskRouteProps,
} from './authorizeTaskRequest'
import { findWorkspaceTask } from './findWorkspaceTask'
import { parseTaskChanges } from './parseTaskChanges'

export const updateRequestTask = async ({
  prisma,
  scheduler,
  callbackUrl,
  request,
  props,
}: TaskRouteOptions & {
  scheduler: TaskScheduler
  request: NextRequest
  props: TaskRouteProps
}) => {
  const authorized = await authorizeTaskRequest({ prisma, props })
  if (!authorized.ok) return authorized

  const parsed = await parseTaskChanges({ request })
  if (!parsed.ok) return parsed

  const existing = await findWorkspaceTask({
    prisma,
    access: authorized.access,
  })
  if (!existing.ok) return existing

  return updateScheduledTask({
    prisma,
    scheduler,
    callbackUrl,
    existingTask: existing.task,
    changes: parsed.changes,
    where: { id: existing.task.id },
  })
}
