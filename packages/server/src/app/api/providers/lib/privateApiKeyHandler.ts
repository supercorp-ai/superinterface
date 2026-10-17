import type { PrismaClient } from '@prisma/client'
import type { NextRequest, NextResponse } from 'next/server'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'

// Builds a route handler that authorizes the private api key first,
// answering with the authorization's error response when it fails and
// handing the key's workspace id to the handler otherwise.
export const privateApiKeyHandler =
  ({
    prisma,
    handle,
  }: {
    prisma: PrismaClient
    handle: (args: {
      request: NextRequest
      workspaceId: string
    }) => Promise<NextResponse>
  }) =>
  async (request: NextRequest) => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return errorResponse

    return handle({ request, workspaceId: privateApiKey.workspaceId })
  }
