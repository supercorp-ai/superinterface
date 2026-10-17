import type { PrismaClient } from '@prisma/client'
import {
  authorizeTaskRequest,
  type TaskRouteProps,
} from './authorizeTaskRequest'
import { findWorkspaceTask } from './findWorkspaceTask'

export const findRequestTask = async ({
  prisma,
  props,
}: {
  prisma: PrismaClient
  props: TaskRouteProps
}) => {
  const authorized = await authorizeTaskRequest({ prisma, props })
  if (!authorized.ok) return authorized

  return findWorkspaceTask({ prisma, access: authorized.access })
}
