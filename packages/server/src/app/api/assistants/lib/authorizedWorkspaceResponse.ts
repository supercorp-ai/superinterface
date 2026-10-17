import type { PrismaClient } from '@prisma/client'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'

// Answers with the private api key's error response when it is missing or
// invalid, and with the response for the key's workspace otherwise.
export const authorizedWorkspaceResponse = async <HandlerResponse>({
  prisma,
  respond,
}: {
  prisma: PrismaClient
  respond: (args: { workspaceId: string }) => Promise<HandlerResponse>
}) => {
  const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
    prisma,
  })

  if (errorResponse) return errorResponse

  return respond({ workspaceId: privateApiKey.workspaceId })
}
