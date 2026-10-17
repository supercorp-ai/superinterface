import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { functionInclude } from '@/lib/functions/functionInclude'
import { serializeApiFunction } from '@/lib/functions/serializeApiFunction'

// Lists the assistant's functions, newest first. `where` comes from
// authorizeAssistantRequest, so only assistants of the api key's workspace
// are found.
export const listFunctionsResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
}) => {
  const assistant = await prisma.assistant.findFirst({
    where,
    include: {
      functions: {
        include: functionInclude,
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
      functions: assistant.functions.map((fn) => serializeApiFunction({ fn })),
    },
    { headers: cacheHeaders },
  )
}
