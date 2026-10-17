import type { NextResponse } from 'next/server'
import type { Prisma, PrismaClient } from '@prisma/client'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'
import { invalidApiKeyResponse } from '@/lib/apiKeys/invalidApiKeyResponse'

type AuthorizedPublicApiKey =
  | { workspaceAccessWhere: Prisma.WorkspaceWhereInput; errorResponse: null }
  | { errorResponse: NextResponse }

// Finds the workspace access a public api key gives, rejecting the request
// when the key is missing or unknown.
export const authorizePublicApiKey = async ({
  publicApiKey,
  prisma,
}: {
  publicApiKey: string | undefined
  prisma: PrismaClient
}): Promise<AuthorizedPublicApiKey> => {
  const workspaceAccessWhere = await getWorkspaceAccessWhere({
    publicApiKey: publicApiKey ?? null,
    prisma,
  })

  if (!workspaceAccessWhere) {
    return { errorResponse: invalidApiKeyResponse() }
  }

  return { workspaceAccessWhere, errorResponse: null }
}
