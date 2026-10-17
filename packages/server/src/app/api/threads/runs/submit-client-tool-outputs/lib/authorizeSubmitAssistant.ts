import type { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { authorizePublicApiKey } from '@/app/api/messages/lib/authorizePublicApiKey'
import { badRequestResponse } from './badRequestResponse'

type AuthorizedSubmitAssistant =
  | { errorResponse: null }
  | { errorResponse: NextResponse }

// Checks the public api key gives access to the assistant whose run the tool
// outputs are submitted for.
export const authorizeSubmitAssistant = async ({
  prisma,
  publicApiKey,
  assistantId,
}: {
  prisma: PrismaClient
  publicApiKey: string | undefined
  assistantId: string | undefined
}): Promise<AuthorizedSubmitAssistant> => {
  const authorized = await authorizePublicApiKey({ publicApiKey, prisma })

  if (authorized.errorResponse) return authorized

  if (!assistantId) {
    return {
      errorResponse: badRequestResponse({ error: 'No assistant id found' }),
    }
  }

  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      workspace: authorized.workspaceAccessWhere,
    },
  })

  if (!assistant) return { errorResponse: noAssistantFoundResponse() }

  return { errorResponse: null }
}
