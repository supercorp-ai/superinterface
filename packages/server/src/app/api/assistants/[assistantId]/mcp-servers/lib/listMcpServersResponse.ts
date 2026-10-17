import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import { serializeApiMcpServer } from '@/lib/mcpServers/serializeApiMcpServer'

// Lists the assistant's MCP servers, newest first. `where` comes from
// authorizeAssistantRequest, so only assistants of the api key's workspace
// are found.
export const listMcpServersResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
}) => {
  const assistant = await prisma.assistant.findFirst({
    where,
    include: {
      mcpServers: {
        include: {
          stdioTransport: true,
          sseTransport: true,
          httpTransport: true,
        },
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
      mcpServers: assistant.mcpServers.map((mcpServer) =>
        serializeApiMcpServer({
          mcpServer,
        }),
      ),
    },
    { headers: cacheHeaders },
  )
}
