import {
  LogRequestMethod,
  type Prisma,
  type PrismaClient,
} from '@prisma/client'
import { messagesErrorResponse } from '@/lib/logs/messagesErrorResponse'
import { getWorkspaceId } from './getWorkspaceId'

// Rejects a request before its assistant is known, logging it against the
// workspace the api key gives access to. GET requests are logged as POST too.
export const assistantRequestErrorResponse = async ({
  prisma,
  workspaceAccessWhere,
  logMessage,
  error,
}: {
  prisma: PrismaClient
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
  logMessage: string
  error: string
}) =>
  messagesErrorResponse({
    prisma,
    requestMethod: LogRequestMethod.POST,
    status: 400,
    logMessage,
    error,
    workspaceId: await getWorkspaceId({ workspaceAccessWhere, prisma }),
  })
