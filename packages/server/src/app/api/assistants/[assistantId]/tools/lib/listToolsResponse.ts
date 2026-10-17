import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { serializeApiTool, toolInclude } from '@/lib/tools/serializeApiTool'

// Lists the assistant's tools, newest first. `where` comes from
// authorizeAssistantRequest, so only assistants of the api key's workspace
// are found.
export const listToolsResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
}) => {
  const assistant = await prisma.assistant.findFirst({
    where,
    include: {
      tools: {
        include: toolInclude,
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!assistant) {
    return noAssistantFoundResponse()
  }

  return NextResponse.json(
    {
      tools: assistant.tools.map((tool) => serializeApiTool({ tool })),
    },
    { headers: cacheHeaders },
  )
}
