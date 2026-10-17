import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { apiAssistantInclude } from '@/lib/assistants/apiAssistantInclude'
import { serializeApiAssistant } from '@/lib/assistants/serializeApiAssistant'

// Lists the assistants of the api key's workspace.
export const listAssistantsResponse = async ({
  prisma,
  workspaceId,
}: {
  prisma: PrismaClient
  workspaceId: string
}) => {
  const assistants = await prisma.assistant.findMany({
    where: {
      workspaceId,
    },
    include: apiAssistantInclude,
  })

  return NextResponse.json(
    {
      assistants: assistants.map((assistant) =>
        serializeApiAssistant({ assistant }),
      ),
    },
    { headers: cacheHeaders },
  )
}
