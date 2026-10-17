import type { PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { noAssistantFoundResponse } from '@/lib/assistants/noAssistantFoundResponse'
import type { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'
import { normalizeMcpServerName } from '@/lib/mcpServers/normalizeMcpServerName'
import { isMcpServerLabelTaken } from '@/lib/mcpServers/isMcpServerLabelTaken'
import { isValidMcpServerLabel } from '@/lib/mcpServers/isValidMcpServerLabel'
import { invalidMcpServerNameResponse } from '@/lib/mcpServers/invalidMcpServerNameResponse'
import { mcpServerNameTakenResponse } from '@/lib/mcpServers/mcpServerNameTakenResponse'
import { mcpServerData } from '@/lib/mcpServers/mcpServerData'
import { mcpServerResponse } from '@/lib/mcpServers/mcpServerResponse'

// Creates the MCP server after checking that the assistant exists and that
// the server's label, if named, is valid and not used by another server.
// `where` comes from authorizeAssistantRequest, so only assistants of the api
// key's workspace are found.
export const createMcpServerResponse = async ({
  prisma,
  where,
  assistantId,
  body,
}: {
  prisma: PrismaClient
  where: { id: string; workspaceId: string }
  assistantId: string
  body: z.infer<typeof mcpServerSchema>
}) => {
  const assistant = await prisma.assistant.findFirst({ where })

  if (!assistant) {
    return noAssistantFoundResponse()
  }

  if (typeof body.name === 'string') {
    const label = normalizeMcpServerName(body.name)

    if (!isValidMcpServerLabel({ label })) {
      return invalidMcpServerNameResponse()
    }

    if (await isMcpServerLabelTaken({ prisma, assistantId, label })) {
      return mcpServerNameTakenResponse()
    }
  }

  const mcpServer = await prisma.mcpServer.create({
    data: {
      ...mcpServerData({ body, operation: 'create' }),
      assistant: {
        connect: where,
      },
    },
    include: {
      stdioTransport: true,
      sseTransport: true,
      httpTransport: true,
    },
  })

  return mcpServerResponse({ mcpServer })
}
