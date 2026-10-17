import { isString } from 'radash'
import type { NextResponse } from 'next/server'
import type { Prisma, PrismaClient } from '@prisma/client'
import { authorizePublicApiKey } from '@/app/api/messages/lib/authorizePublicApiKey'
import { badRequestResponse } from './badRequestResponse'

type AuthorizedFileRequest =
  | {
      assistantId: string
      workspaceAccessWhere: Prisma.WorkspaceWhereInput
      errorResponse: null
    }
  | { errorResponse: NextResponse }

// Reads the assistantId and publicApiKey a file request carries, as query
// params or form fields, and the workspace access the key gives.
export const authorizeFileRequest = async ({
  params,
  prisma,
}: {
  params: { get: (name: string) => unknown }
  prisma: PrismaClient
}): Promise<AuthorizedFileRequest> => {
  const assistantId = params.get('assistantId')

  if (!isString(assistantId)) {
    return {
      errorResponse: badRequestResponse({ error: 'Invalid assistantId' }),
    }
  }

  const publicApiKey = params.get('publicApiKey')

  if (!isString(publicApiKey)) {
    return {
      errorResponse: badRequestResponse({ error: 'Invalid publicApiKey' }),
    }
  }

  const authorized = await authorizePublicApiKey({ publicApiKey, prisma })

  if (authorized.errorResponse) return authorized

  // An empty assistantId passes as a string, and is only rejected once the
  // api key is known to be valid.
  if (assistantId === '') {
    return {
      errorResponse: badRequestResponse({ error: 'No assistantId found' }),
    }
  }

  return {
    assistantId,
    workspaceAccessWhere: authorized.workspaceAccessWhere,
    errorResponse: null,
  }
}
