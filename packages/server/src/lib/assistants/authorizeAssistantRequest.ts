import type { PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { assistantWhere } from '@/lib/assistants/assistantWhere'

// Authorizes a private api key request and scopes the assistant to the
// key's workspace, or returns the error response to send.
export const authorizeAssistantRequest =
  ({ prisma }: { prisma: PrismaClient }) =>
  async ({ assistantId }: { assistantId: string }) => {
    const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
      prisma,
    })

    if (errorResponse) return { errorResponse }

    return {
      where: assistantWhere({
        assistantId,
        workspaceId: privateApiKey.workspaceId,
      }),
    }
  }
