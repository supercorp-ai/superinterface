import { type NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'
import { invalidApiKeyResponse } from '@/lib/apiKeys/invalidApiKeyResponse'
import { serializeAssistant } from '@/lib/assistants/serializeAssistant'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'

export const publicAssistantResponse = async ({
  prisma,
  request,
  assistantId,
}: {
  prisma: PrismaClient
  request: NextRequest
  assistantId: string
}) => {
  const workspaceAccessWhere = await getWorkspaceAccessWhere({
    publicApiKey: request.nextUrl.searchParams.get('publicApiKey'),
    prisma,
  })

  if (!workspaceAccessWhere) {
    return invalidApiKeyResponse()
  }

  if (!assistantId) {
    return NextResponse.json(
      { error: 'No assistant id found' },
      { status: 400 },
    )
  }

  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      workspace: workspaceAccessWhere,
    },
    include: {
      avatar: {
        include: {
          imageAvatar: true,
          iconAvatar: true,
        },
      },
    },
  })

  if (!assistant) {
    return noAssistantFoundResponse()
  }

  return NextResponse.json(
    {
      assistant: serializeAssistant({ assistant }),
    },
    { headers: cacheHeaders },
  )
}
