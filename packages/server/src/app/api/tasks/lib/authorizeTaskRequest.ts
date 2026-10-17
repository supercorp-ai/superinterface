import type { PrismaClient } from '@prisma/client'
import { validate } from 'uuid'
import { authorizeTasksRequest } from './authorizeTasksRequest'

export type TaskRouteProps = { params: Promise<{ taskId: string }> }

export type TaskAccess = { taskId: string; workspaceId: string }

export const authorizeTaskRequest = async ({
  prisma,
  props,
}: {
  prisma: PrismaClient
  props: TaskRouteProps
}) => {
  const { taskId } = await props.params

  const authorized = await authorizeTasksRequest({ prisma })
  if (!authorized.ok) return authorized

  if (!taskId) return { ok: false as const, error: 'No task id found' }
  if (!validate(taskId)) return { ok: false as const, error: 'Invalid task id' }

  const access: TaskAccess = { taskId, workspaceId: authorized.workspaceId }

  return { ok: true as const, access }
}
