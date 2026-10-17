import type { NextResponse } from 'next/server'
import type { Prisma, PrismaClient } from '@prisma/client'
import { assistantClientInclude } from '@/lib/assistants/assistantClientInclude'
import { isAssistantSetupIncomplete } from '@/app/api/messages/lib/isAssistantSetupIncomplete'
import { badRequestResponse } from './badRequestResponse'

export type FileAssistant = Prisma.AssistantGetPayload<{
  include: typeof assistantClientInclude
}>

type FoundFileAssistant =
  | { assistant: FileAssistant; errorResponse: null }
  | { errorResponse: NextResponse }

// Finds the assistant whose storage provider holds the files, as long as it
// is ready to build a client for.
export const findFileAssistant = async ({
  prisma,
  assistantId,
  workspaceAccessWhere,
}: {
  prisma: PrismaClient
  assistantId: string
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
}): Promise<FoundFileAssistant> => {
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      workspace: workspaceAccessWhere,
    },
    include: assistantClientInclude,
  })

  if (!assistant) {
    return {
      errorResponse: badRequestResponse({ error: 'No assistant found' }),
    }
  }

  if (isAssistantSetupIncomplete({ assistant })) {
    return {
      errorResponse: badRequestResponse({
        error: 'Assistant setup is not done.',
      }),
    }
  }

  return { assistant, errorResponse: null }
}
