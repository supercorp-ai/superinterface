import type { NextRequest } from 'next/server'
import type { TaskScheduler } from '@/lib/tasks/schedulers/types'
import { createScheduledTask } from '@/lib/tasks/createScheduledTask'
import type { TaskRouteOptions } from './TaskRouteOptions'
import { authorizeTasksRequest } from './authorizeTasksRequest'
import { findWorkspaceThread } from './findWorkspaceThread'
import { parseNewTask } from './parseNewTask'

export const createRequestTask = async ({
  prisma,
  scheduler,
  callbackUrl,
  request,
}: TaskRouteOptions & { scheduler: TaskScheduler; request: NextRequest }) => {
  const authorized = await authorizeTasksRequest({ prisma })
  if (!authorized.ok) return authorized

  const parsed = await parseNewTask({ request })
  if (!parsed.ok) return parsed

  const found = await findWorkspaceThread({
    prisma,
    threadId: parsed.newTask.threadId,
    workspaceId: authorized.workspaceId,
  })
  if (!found.ok) return found

  return createScheduledTask({
    prisma,
    scheduler,
    callbackUrl,
    newTask: { ...parsed.newTask, threadId: found.thread.id },
  })
}
